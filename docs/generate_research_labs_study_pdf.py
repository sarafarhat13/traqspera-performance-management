#!/usr/bin/env python3
"""Generate Trimble Research Labs study guide + survey PDF."""

from pathlib import Path

from fpdf import FPDF

OUT = Path(__file__).resolve().parent / "Trimble-Research-Labs-Performance-Management-Study.pdf"


def ascii_safe(text: str) -> str:
    """Helvetica core fonts are Latin-1 only."""
    return (
        text.replace("\u2014", " - ")
        .replace("\u2013", "-")
        .replace("\u2192", "->")
        .replace("\u201c", '"')
        .replace("\u201d", '"')
    )


class StudyPDF(FPDF):
    def footer(self):
        self.set_y(-15)
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(100, 100, 100)
        self.cell(
            0,
            10,
            ascii_safe(
                f"Trimble Research Labs - Performance Management Prototype  |  Page {self.page_no()}"
            ),
            align="C",
        )

    def section_title(self, title: str):
        self.ln(4)
        self.set_font("Helvetica", "B", 14)
        self.set_text_color(0, 102, 153)
        self.multi_cell(0, 8, ascii_safe(title))
        self.set_text_color(0, 0, 0)
        self.ln(2)

    def sub_title(self, title: str):
        self.set_font("Helvetica", "B", 11)
        self.multi_cell(0, 6, ascii_safe(title))
        self.ln(1)

    def body(self, text: str):
        self.set_x(self.l_margin)
        self.set_font("Helvetica", "", 10)
        self.multi_cell(0, 5, ascii_safe(text))
        self.ln(2)

    def bullet(self, text: str, indent: float = 8):
        self.set_x(self.l_margin + indent)
        self.set_font("Helvetica", "", 10)
        w = self.w - self.l_margin - self.r_margin - indent
        self.multi_cell(w, 5, ascii_safe(f"- {text}"))
        self.set_x(self.l_margin)

    def numbered(self, n: int, text: str):
        self.set_x(self.l_margin)
        self.set_font("Helvetica", "", 10)
        self.multi_cell(0, 5, ascii_safe(f"{n}. {text}"))
        self.ln(1)

    def likert_row(self, statement: str):
        self.set_x(self.l_margin)
        self.multi_cell(0, 4, ascii_safe(statement))
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(80, 80, 80)
        self.cell(
            0,
            4,
            ascii_safe(
                "Strongly disagree  1 - 2 - 3 - 4 - 5  Strongly agree     N/A: ___"
            ),
            ln=True,
        )
        self.set_text_color(0, 0, 0)
        self.ln(2)


def build() -> None:
    pdf = StudyPDF()
    pdf.set_auto_page_break(auto=True, margin=18)
    pdf.add_page()

    # Title
    pdf.set_font("Helvetica", "B", 22)
    pdf.set_x(pdf.l_margin)
    pdf.multi_cell(0, 10, "Performance Management Prototype")
    pdf.set_font("Helvetica", "", 14)
    pdf.set_text_color(80, 80, 80)
    pdf.set_x(pdf.l_margin)
    pdf.multi_cell(
        0,
        8,
        ascii_safe("Trimble Research Labs - Participant Tasks & Post-Session Survey"),
    )
    pdf.set_text_color(0, 0, 0)
    pdf.ln(4)
    pdf.body(
        "This document supports a moderated or unmoderated study of the Traqspera Performance "
        "Management interactive prototype. Participants complete realistic HR, manager, and employee "
        "tasks, then answer the survey to capture usefulness, perceived value, design fit, and gaps."
    )
    pdf.body(
        "Prototype: traditional office performance reviews (templates, cycles, workflow steps, "
        "self-evaluation, manager review, employee acknowledgement). Built with Trimble Modus Web "
        "Components inside a Traqspera-style shell. Data is stored locally in the browser only."
    )

    pdf.section_title("Before the session")
    pdf.bullet("Allow 45–60 minutes total (35–45 min tasks + 10–15 min survey).")
    pdf.bullet("Use a desktop browser (Chrome or Edge recommended). Tablet optional for acknowledgement task.")
    pdf.bullet("Open the hosted prototype URL provided by the study coordinator.")
    pdf.bullet("Use the View as role control to switch HR Admin, Employee, and Manager personas.")
    pdf.bullet("Optional: clear site data for a fresh seed, or work with persisted demo data.")
    pdf.ln(2)

    pdf.section_title("Suggested task paths")
    pdf.body(
        "Assign each participant a primary persona based on their real job (HR, people manager, or "
        "individual contributor). Everyone should try at least one task outside their primary role "
        "to stress-test clarity and handoffs."
    )

    pdf.sub_title("A. HR Admin / People Operations (required core — ~20 min)")
    pdf.numbered(
        1,
        "Explore the Performance dashboard: scan KPI cards, active cycles, and the All reviews table. "
        "Use filters (status, cycle, search) to find a specific review.",
    )
    pdf.numbered(
        2,
        "Open Review groups: create a new group, assign default reviewer rules (e.g. crew manager), "
        "add members, and note any unassigned employees warning.",
    )
    pdf.numbered(
        3,
        "Templates: open the template list, edit an existing template (change a question, toggle Required), "
        "save, and confirm changes persist after refresh.",
    )
    pdf.numbered(
        4,
        "Create a new template (or duplicate flow via create): add up to several textarea questions, "
        "save, and return to the list.",
    )
    pdf.numbered(
        5,
        "Launch a review cycle using the wizard: Cycle details (name, dates) → Template (select or create) → "
        "Workflow (enable/disable self-evaluation, reorder employee/manager steps, set due dates, "
        "optional rating scale) → Participants (individuals and/or review groups, resolve conflicts if shown) → "
        "Review & Launch. Launch the cycle or save as draft.",
    )
    pdf.numbered(
        6,
        "Open cycle details from the dashboard: review workflow stage cards and drill into a participant review.",
    )
    pdf.numbered(
        7,
        "Open View details on a review: use all tabs (Overview, Self evaluation, Manager review, Side-by-side). "
        "Try Download review if shown.",
    )

    pdf.sub_title("B. Manager (~15 min)")
    pdf.numbered(
        1,
        "Switch to Manager persona. Open Team reviews (Performance → Team). Scan status badges and due dates.",
    )
    pdf.numbered(
        2,
        "Complete a manager review: open side-by-side form, read employee self-evaluation answers, "
        "enter manager responses, optional overall rating if enabled, submit.",
    )
    pdf.numbered(
        3,
        "Open View details for a completed or in-progress direct report; compare Side-by-side tab to the edit form.",
    )

    pdf.sub_title("C. Employee (~15 min)")
    pdf.numbered(
        1,
        "Switch to Employee persona. Open My Info → Performance (or employee dashboard) and identify pending tasks.",
    )
    pdf.numbered(
        2,
        "Complete a self-evaluation: answer all required questions and submit.",
    )
    pdf.numbered(
        3,
        "Toggle Mobile layout on the employee experience; repeat or open self-evaluation and assess readability.",
    )
    pdf.numbered(
        4,
        "Complete employee acknowledgement for a review in that stage (checkbox + submit).",
    )
    pdf.numbered(
        5,
        "Open a completed review in read-only detail view.",
    )

    pdf.sub_title("D. Cross-role mini-scenario (optional — ~10 min)")
    pdf.body(
        "Facilitator narrates: HR launches a short cycle → Employee submits self-eval → Manager submits review → "
        "Employee acknowledges. Participant switches roles at each step and notes confusion or delight."
    )

    pdf.add_page()
    pdf.section_title("Task completion checklist (facilitator)")
    pdf.body("Mark Y/N for each participant after tasks:")
    for item in [
        "Dashboard explored with filters",
        "Review group created or edited",
        "Template edited and saved",
        "Cycle launched or saved as draft via wizard",
        "Manager review submitted",
        "Self-evaluation submitted",
        "Acknowledgement completed",
        "Review details tabs exercised",
        "Mobile employee layout tried",
    ]:
        pdf.bullet(f"[ ] {item}")
    pdf.ln(4)

    pdf.section_title("Post-session survey — Section 1: About you")
    pdf.body("Participant ID / session date: _________________________________")
    pdf.body("Primary role today (check one):  HR / People Ops   Manager   Individual contributor   Other: ______")
    pdf.body("Years involved in performance reviews (0–1 / 2–5 / 6–10 / 10+):")
    pdf.body("Organization size (optional): _________________________________")

    pdf.section_title("Section 2: Task experience")
    pdf.likert_row("I could complete the assigned tasks without external help.")
    pdf.likert_row("The steps matched how my organization runs (or would run) performance reviews.")
    pdf.likert_row("Switching roles (HR / Manager / Employee) was understandable for a demo.")
    pdf.likert_row("I always knew what to do next for my current role.")

    pdf.section_title("Section 3: Usefulness")
    pdf.likert_row("This prototype would help HR administer review cycles.")
    pdf.likert_row("Managers could efficiently complete reviews with the side-by-side layout.")
    pdf.likert_row("Employees could complete self-evaluation and acknowledgement flows comfortably.")
    pdf.likert_row("Review groups and participant selection would save time vs. manual assignment.")
    pdf.likert_row("The launch cycle wizard covers the configuration I would need before go-live.")
    pdf.likert_row("Review detail tabs give the right information for audit and employee questions.")

    pdf.section_title("Section 4: Value")
    pdf.likert_row("Adopting a product like this would be worth the change effort for our organization.")
    pdf.likert_row("The workflow (self-eval, manager review, acknowledgement, optional rating) fits our policy needs.")
    pdf.likert_row("I trust the information architecture (dashboard, templates, groups, team view) for day-to-day work.")
    pdf.likert_row("This would reduce email/spreadsheet work compared to our current process.")
    pdf.likert_row("I would recommend exploring this further with my stakeholders.")

    pdf.add_page()
    pdf.section_title("Section 5: Design and UX")
    pdf.likert_row("The visual design feels appropriate for Trimble / enterprise HR software.")
    pdf.likert_row("Navigation (Traqspera shell, Performance menu) made it easy to find features.")
    pdf.likert_row("Tables, filters, and status badges communicate progress clearly.")
    pdf.likert_row("Forms (templates, wizard, self-eval, manager review) are easy to read and fill out.")
    pdf.likert_row("Mobile employee layout is adequate for field or tablet use.")
    pdf.likert_row("Error states, validation, and empty states felt trustworthy.")
    pdf.likert_row("The design hit the mark for a modern performance management experience.")

    pdf.section_title("Section 6: Gaps and additions")
    pdf.body("What is missing today that would block you from using this in production?")
    pdf.ln(8)
    pdf.line(pdf.l_margin, pdf.get_y(), pdf.w - pdf.r_margin, pdf.get_y())
    pdf.ln(10)
    pdf.line(pdf.l_margin, pdf.get_y(), pdf.w - pdf.r_margin, pdf.get_y())
    pdf.ln(10)

    pdf.body("What would you add or change first (features, integrations, reports, permissions)?")
    pdf.ln(8)
    pdf.line(pdf.l_margin, pdf.get_y(), pdf.w - pdf.r_margin, pdf.get_y())
    pdf.ln(10)
    pdf.line(pdf.l_margin, pdf.get_y(), pdf.w - pdf.r_margin, pdf.get_y())
    pdf.ln(10)

    pdf.body("Which single screen or flow delighted you? Which frustrated you?")
    pdf.ln(8)
    pdf.line(pdf.l_margin, pdf.get_y(), pdf.w - pdf.r_margin, pdf.get_y())
    pdf.ln(10)

    pdf.section_title("Section 7: Overall")
    pdf.likert_row("Overall satisfaction with this prototype session.")
    pdf.body("Net Promoter-style question: How likely are you to recommend we continue investing in this direction? (0–10)")
    pdf.body("Score: ___")
    pdf.ln(4)
    pdf.body("Any other comments for the product or research team:")
    pdf.ln(8)
    pdf.line(pdf.l_margin, pdf.get_y(), pdf.w - pdf.r_margin, pdf.get_y())
    pdf.ln(12)
    pdf.line(pdf.l_margin, pdf.get_y(), pdf.w - pdf.r_margin, pdf.get_y())

    pdf.ln(6)
    pdf.set_font("Helvetica", "I", 9)
    pdf.set_text_color(100, 100, 100)
    pdf.multi_cell(
        0,
        4,
        ascii_safe(
            "Thank you for participating in Trimble Research Labs. "
            "Responses may be used to prioritize roadmap items for Traqspera Performance Management."
        ),
    )

    pdf.output(str(OUT))
    print(f"Wrote {OUT}")


if __name__ == "__main__":
    build()
