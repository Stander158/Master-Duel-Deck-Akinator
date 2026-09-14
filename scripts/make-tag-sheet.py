"""Generate the archetype tagging workbook.

    python3 scripts/make-tag-sheet.py [output.xlsx]

Produces a three-sheet workbook:

  Instructions  how to fill it in
  Tags          the tag vocabulary, defined by hand
  Archetypes    one row per archetype, tags chosen from that vocabulary

The tag columns are dropdowns bound to the Tags sheet, so a tag can only be
applied after it has been defined and typos cannot silently create new tags.
Re-running the script rebuilds the workbook from scratch — it does not merge
into an existing one.
"""

import json
import re
import sys
from pathlib import Path

from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation

ROOT = Path(__file__).resolve().parent.parent
NAMES_FILE = ROOT / "src/data/archetype-names.json"

TAG_COLUMNS = 8
TAG_VOCAB_ROWS = 120

FONT = "Arial"
HEADER_FILL = PatternFill("solid", fgColor="111B31")
FILL_ME_FILL = PatternFill("solid", fgColor="FFF9DB")
EXAMPLE_FILL = PatternFill("solid", fgColor="EEEEEE")
THIN = Side(style="thin", color="BFBFBF")
BORDER = Border(left=THIN, right=THIN, top=THIN, bottom=THIN)


def slugify(name: str) -> str:
    """Mirror of slugify() in src/data/slugify.ts — ids must match exactly."""
    return re.sub(r"^-+|-+$", "", re.sub(r"[^a-z0-9]+", "-", name.lower()))


def style_header(sheet, row: int, last_column: int) -> None:
    for column in range(1, last_column + 1):
        cell = sheet.cell(row=row, column=column)
        cell.font = Font(name=FONT, bold=True, color="FFFFFF")
        cell.fill = HEADER_FILL
        cell.alignment = Alignment(vertical="center")
        cell.border = BORDER
    sheet.row_dimensions[row].height = 22


def build_instructions(sheet) -> None:
    sheet.sheet_view.showGridLines = False
    lines = [
        ("Archetype tagging", True, 14),
        ("", False, 11),
        ("Fill in two sheets, in this order.", False, 11),
        ("", False, 11),
        ("1. Tags — define the vocabulary", True, 12),
        ("Every tag you intend to use, one per row. Category is yours to define; it only", False, 11),
        ("groups tags in this sheet and does not reach the app. Delete the EXAMPLE row.", False, 11),
        ("", False, 11),
        ("2. Archetypes — apply the tags", True, 12),
        ("266 rows, one per archetype. The tag1-tag8 columns are dropdowns listing whatever", False, 11),
        ("you defined on the Tags sheet, so define a tag before applying it. Leave unused", False, 11),
        ("columns blank; order within a row does not matter.", False, 11),
        ("", False, 11),
        ("Format", True, 12),
        ("A tag is a short lowercase slug. In code it becomes a plain string, so keep it", False, 11),
        ("stable once used: renaming means re-tagging every archetype that carries it.", False, 11),
        ("", False, 11),
        ("Worked example of a filled row (this is format only, not a suggested taxonomy):", False, 11),
        ("    id = blue-eyes    name = Blue-Eyes    tag1 = <your tag>    tag2 = <your tag>", False, 10),
        ("", False, 11),
        ("Yellow cells are the ones to edit. Everything else is generated.", False, 11),
        ("", False, 11),
        ("Do not edit", True, 12),
        ("The id and name columns on the Archetypes sheet. They key the import back into", False, 11),
        ("code — editing them orphans the row. Add archetypes upstream, not here.", False, 11),
        ("", False, 11),
        ("Heads up", True, 12),
        ("This archetype list is provisional. It will be regenerated from EDOPro's", False, 11),
        ("strings.conf, which will add sub-archetypes and correct some spellings. Rows are", False, 11),
        ("matched back by id and then by name, so most filled rows survive, but expect", False, 11),
        ("some to need re-checking after that swap.", False, 11),
    ]
    for index, (text, bold, size) in enumerate(lines, start=1):
        cell = sheet.cell(row=index, column=1, value=text)
        cell.font = Font(name=FONT, bold=bold, size=size)
    sheet.column_dimensions["A"].width = 95


def build_tags(sheet) -> None:
    headers = ["tag", "category", "description", "used_by"]
    for column, header in enumerate(headers, start=1):
        sheet.cell(row=1, column=column, value=header)
    style_header(sheet, 1, len(headers))

    # One example row showing the expected shape. Deliberately generic — the
    # vocabulary itself is the user's to decide.
    example = ["example-tag", "example-category", "Delete this row once you start."]
    for column, value in enumerate(example, start=1):
        cell = sheet.cell(row=2, column=column, value=value)
        cell.font = Font(name=FONT, italic=True, color="808080")
        cell.fill = EXAMPLE_FILL
        cell.border = BORDER

    last_archetype_row = 1 + len(load_names())
    for row in range(2, TAG_VOCAB_ROWS + 2):
        for column in range(1, 4):
            cell = sheet.cell(row=row, column=column)
            cell.font = Font(name=FONT)
            cell.border = BORDER
            if row > 2:
                cell.fill = FILL_ME_FILL
        # Blank out the count on empty rows so an empty criteria does not
        # count every empty cell in the range.
        count = sheet.cell(
            row=row,
            column=4,
            value=(
                f'=IF(A{row}="","",'
                f"COUNTIF(Archetypes!$C$2:$J${last_archetype_row},A{row}))"
            ),
        )
        count.font = Font(name=FONT)
        count.border = BORDER
        count.alignment = Alignment(horizontal="center")

    for column, width in zip("ABCD", (26, 20, 52, 10)):
        sheet.column_dimensions[column].width = width
    sheet.freeze_panes = "A2"


def build_archetypes(sheet, names: list[str]) -> None:
    headers = (
        ["id", "name"]
        + [f"tag{i}" for i in range(1, TAG_COLUMNS + 1)]
        + ["tag_count", "notes"]
    )
    for column, header in enumerate(headers, start=1):
        sheet.cell(row=1, column=column, value=header)
    style_header(sheet, 1, len(headers))

    first_tag_col = 3
    last_tag_col = first_tag_col + TAG_COLUMNS - 1
    count_col = last_tag_col + 1
    notes_col = count_col + 1

    for offset, name in enumerate(names):
        row = offset + 2
        id_cell = sheet.cell(row=row, column=1, value=slugify(name))
        name_cell = sheet.cell(row=row, column=2, value=name)
        for cell in (id_cell, name_cell):
            cell.font = Font(name=FONT, color="595959")
            cell.border = BORDER

        for column in range(first_tag_col, last_tag_col + 1):
            cell = sheet.cell(row=row, column=column)
            cell.font = Font(name=FONT)
            cell.fill = FILL_ME_FILL
            cell.border = BORDER

        first = get_column_letter(first_tag_col)
        last = get_column_letter(last_tag_col)
        count = sheet.cell(row=row, column=count_col, value=f"=COUNTA({first}{row}:{last}{row})")
        count.font = Font(name=FONT)
        count.border = BORDER
        count.alignment = Alignment(horizontal="center")

        notes = sheet.cell(row=row, column=notes_col)
        notes.font = Font(name=FONT)
        notes.fill = FILL_ME_FILL
        notes.border = BORDER

    # Dropdowns bound to the Tags sheet, so only defined tags can be applied.
    validation = DataValidation(
        type="list",
        formula1=f"=Tags!$A$2:$A${TAG_VOCAB_ROWS + 1}",
        allow_blank=True,
        showDropDown=False,
    )
    validation.error = "Define the tag on the Tags sheet first."
    validation.errorTitle = "Unknown tag"
    validation.prompt = "Pick a tag defined on the Tags sheet."
    sheet.add_data_validation(validation)
    validation.add(
        f"{get_column_letter(first_tag_col)}2:"
        f"{get_column_letter(last_tag_col)}{len(names) + 1}"
    )

    sheet.column_dimensions["A"].width = 24
    sheet.column_dimensions["B"].width = 26
    for column in range(first_tag_col, last_tag_col + 1):
        sheet.column_dimensions[get_column_letter(column)].width = 16
    sheet.column_dimensions[get_column_letter(count_col)].width = 11
    sheet.column_dimensions[get_column_letter(notes_col)].width = 40
    sheet.freeze_panes = "C2"
    sheet.auto_filter.ref = f"A1:{get_column_letter(notes_col)}{len(names) + 1}"


def load_names() -> list[str]:
    return json.loads(NAMES_FILE.read_text())


def main() -> None:
    names = load_names()
    out = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "archetype-tags.xlsx"

    workbook = Workbook()
    build_instructions(workbook.active)
    workbook.active.title = "Instructions"
    build_tags(workbook.create_sheet("Tags"))
    build_archetypes(workbook.create_sheet("Archetypes"), names)

    workbook.save(out)
    print(f"Wrote {out} — {len(names)} archetypes, {TAG_COLUMNS} tag columns")


if __name__ == "__main__":
    main()
