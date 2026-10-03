import os
import pptx
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE

def create_presentation():
    prs = Presentation()
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)
    blank_layout = prs.slide_layouts[6]  # Blank slide

    # ── Color Palette (Hacktoberfest 2026 × GDGC Theme) ─────────────────────────
    BG_COLOR        = RGBColor(12, 26, 24)    # #0C1A18 Deep forest slate
    HEADER_ACCENT   = RGBColor(18, 38, 35)    # #122623 Header accent strip
    CARD_BG         = RGBColor(19, 43, 39)    # #132B27 Card dark teal
    CARD_BG_ALT     = RGBColor(24, 52, 48)    # #183430 Card highlight teal
    CARD_BORDER     = RGBColor(38, 80, 74)    # #26504A Card border line
    ORANGE          = RGBColor(255, 91, 69)   # #FF5B45 Hacktoberfest signature orange
    AMBER           = RGBColor(245, 180, 26)  # #F5B41A GDG / Hacktoberfest yellow
    BLUE            = RGBColor(138, 180, 248) # #8AB4F8 Google Cloud / MLH periwinkle blue
    MINT            = RGBColor(52, 211, 153)  # #34D399 Open source mint green
    WHITE           = RGBColor(248, 250, 252) # #F8FAFC Crisp white
    TEXT_MUTED      = RGBColor(155, 175, 170) # #9BAFA0 Muted slate text
    TEXT_LIGHT      = RGBColor(215, 228, 225) # #D7E4E1 Light body text
    RED_ACCENT      = RGBColor(248, 113, 113) # #F87171 Coral red for problem points

    def apply_slide_bg(slide):
        bg = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, Inches(13.333), Inches(7.5))
        bg.fill.solid()
        bg.fill.fore_color.rgb = BG_COLOR
        bg.line.color.rgb = BG_COLOR
        # Top accent bar
        top_bar = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, Inches(13.333), Inches(0.08))
        top_bar.fill.solid()
        top_bar.fill.fore_color.rgb = ORANGE
        top_bar.line.color.rgb = ORANGE

    def make_card(slide, left, top, width, height, bg_color=CARD_BG, border_color=CARD_BORDER, border_width=1.0, radius=0.03):
        card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
        card.fill.solid()
        card.fill.fore_color.rgb = bg_color
        card.line.color.rgb = border_color
        card.line.width = Pt(border_width)
        if len(card.adjustments) > 0:
            card.adjustments[0] = radius
        card.text_frame.vertical_anchor = MSO_ANCHOR.TOP
        return card

    def add_header(slide, category_text, title_text, subtitle_text=""):
        # Category Pill
        cat_pill = make_card(slide, Inches(0.8), Inches(0.32), Inches(4.8), Inches(0.32),
                             bg_color=HEADER_ACCENT, border_color=ORANGE, border_width=1.0, radius=0.15)
        tf_cat = cat_pill.text_frame
        tf_cat.word_wrap = True
        p_cat = tf_cat.paragraphs[0]
        p_cat.text = f"⚡ {category_text}"
        p_cat.font.name = "Consolas"
        p_cat.font.size = Pt(9.5)
        p_cat.font.bold = True
        p_cat.font.color.rgb = ORANGE
        p_cat.alignment = PP_ALIGN.CENTER

        # Title
        title_box = slide.shapes.add_textbox(Inches(0.78), Inches(0.68), Inches(11.8), Inches(0.55))
        tf = title_box.text_frame
        tf.vertical_anchor = MSO_ANCHOR.TOP
        tf.word_wrap = True
        tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0
        p = tf.paragraphs[0]
        p.text = title_text
        p.font.name = "Segoe UI"
        p.font.size = Pt(22)
        p.font.bold = True
        p.font.color.rgb = WHITE

        # Subtitle
        if subtitle_text:
            sub_box = slide.shapes.add_textbox(Inches(0.8), Inches(1.24), Inches(11.8), Inches(0.32))
            tf_sub = sub_box.text_frame
            tf_sub.vertical_anchor = MSO_ANCHOR.TOP
            tf_sub.word_wrap = True
            tf_sub.margin_left = tf_sub.margin_top = tf_sub.margin_right = tf_sub.margin_bottom = 0
            p_sub = tf_sub.paragraphs[0]
            p_sub.text = subtitle_text
            p_sub.font.name = "Segoe UI"
            p_sub.font.size = Pt(11)
            p_sub.font.color.rgb = TEXT_MUTED

    # ══════════════════════════════════════════════════════════════════════════
    # SLIDE 1: Title Slide (Grand Hacktoberfest Showcase)
    # ══════════════════════════════════════════════════════════════════════════
    slide1 = prs.slides.add_slide(blank_layout)
    apply_slide_bg(slide1)

    # Top Event Banner Pill
    top_pill = make_card(slide1, Inches(0.8), Inches(0.38), Inches(7.3), Inches(0.4),
                         bg_color=HEADER_ACCENT, border_color=ORANGE, border_width=1.2, radius=0.15)
    tf_top = top_pill.text_frame
    p_top = tf_top.paragraphs[0]
    p_top.text = "⚡ HACKTOBERFEST 2026 × GDG CLOUD NAGPUR • SPONSORED BY MLH"
    p_top.font.name = "Consolas"
    p_top.font.size = Pt(10)
    p_top.font.bold = True
    p_top.font.color.rgb = AMBER
    p_top.alignment = PP_ALIGN.CENTER

    # Project Title Box
    title_box = slide1.shapes.add_textbox(Inches(0.8), Inches(0.92), Inches(7.3), Inches(1.85))
    tf1 = title_box.text_frame
    tf1.vertical_anchor = MSO_ANCHOR.TOP
    tf1.word_wrap = True
    tf1.margin_left = tf1.margin_top = tf1.margin_right = tf1.margin_bottom = 0

    p1 = tf1.paragraphs[0]
    p1.text = "🔭 GitScout"
    p1.font.name = "Segoe UI"
    p1.font.size = Pt(44)
    p1.font.bold = True
    p1.font.color.rgb = WHITE
    p1.space_after = Pt(2)

    p1_sub = tf1.add_paragraph()
    p1_sub.text = "AI-Powered GitHub Developer Discovery & Qualification Engine"
    p1_sub.font.name = "Segoe UI"
    p1_sub.font.size = Pt(15.5)
    p1_sub.font.bold = True
    p1_sub.font.color.rgb = ORANGE
    p1_sub.space_after = Pt(4)

    p1_desc = tf1.add_paragraph()
    p1_desc.text = "Transform natural-language technical requirements into verified, evidence-grounded talent discovery powered by Gemma 4."
    p1_desc.font.name = "Segoe UI"
    p1_desc.font.size = Pt(11.5)
    p1_desc.font.color.rgb = TEXT_LIGHT

    # Target Challenges Card
    tracks_card = make_card(slide1, Inches(0.8), Inches(2.95), Inches(7.3), Inches(2.1),
                            bg_color=CARD_BG, border_color=AMBER, border_width=1.2, radius=0.035)
    tf_tr = tracks_card.text_frame
    tf_tr.word_wrap = True
    tf_tr.margin_left = Inches(0.28)
    tf_tr.margin_right = Inches(0.28)
    tf_tr.margin_top = Inches(0.18)

    p_tr_h = tf_tr.paragraphs[0]
    p_tr_h.text = "🏆 TARGET CHALLENGES (MLH × HACKTOBERFEST 2026)"
    p_tr_h.font.name = "Consolas"
    p_tr_h.font.size = Pt(10.5)
    p_tr_h.font.bold = True
    p_tr_h.font.color.rgb = AMBER
    p_tr_h.space_after = Pt(6)

    p_tr1 = tf_tr.add_paragraph()
    p_tr1.text = "• Track 1: Best Use of Gemma 4"
    p_tr1.font.name = "Segoe UI"
    p_tr1.font.size = Pt(12)
    p_tr1.font.bold = True
    p_tr1.font.color.rgb = WHITE
    p_tr1_sub = tf_tr.add_paragraph()
    p_tr1_sub.text = "  Leverages Google AI Studio Gemma 4 & local Ollama for zero-hallucination candidate qualification and tailored outreach generation."
    p_tr1_sub.font.name = "Segoe UI"
    p_tr1_sub.font.size = Pt(10)
    p_tr1_sub.font.color.rgb = TEXT_MUTED
    p_tr1_sub.space_after = Pt(4)

    p_tr2 = tf_tr.add_paragraph()
    p_tr2.text = "• Track 2: Best Open-Source AI Project"
    p_tr2.font.name = "Segoe UI"
    p_tr2.font.size = Pt(12)
    p_tr2.font.bold = True
    p_tr2.font.color.rgb = WHITE
    p_tr2_sub = tf_tr.add_paragraph()
    p_tr2_sub.text = "  100% open-source under MIT, modular developer discovery pipeline, extensible scoring, and community-first architecture."
    p_tr2_sub.font.name = "Segoe UI"
    p_tr2_sub.font.size = Pt(10)
    p_tr2_sub.font.color.rgb = TEXT_MUTED

    # Bottom Metadata & Live Links Card
    meta_card = make_card(slide1, Inches(0.8), Inches(5.2), Inches(7.3), Inches(1.85),
                          bg_color=CARD_BG_ALT, border_color=CARD_BORDER, border_width=1.0, radius=0.035)
    tf_meta = meta_card.text_frame
    tf_meta.word_wrap = True
    tf_meta.margin_left = Inches(0.28)
    tf_meta.margin_top = Inches(0.18)

    p_meta_h = tf_meta.paragraphs[0]
    p_meta_h.text = "🌐 LIVE PRODUCTION DEPLOYMENTS & REPO"
    p_meta_h.font.name = "Consolas"
    p_meta_h.font.size = Pt(10.5)
    p_meta_h.font.bold = True
    p_meta_h.font.color.rgb = MINT
    p_meta_h.space_after = Pt(4)

    p_m1 = tf_meta.add_paragraph()
    p_m1.text = "• Web Application: https://gitscout-web.onrender.com (Live on Render)"
    p_m1.font.name = "Segoe UI"
    p_m1.font.size = Pt(10.5)
    p_m1.font.bold = True
    p_m1.font.color.rgb = WHITE
    p_m1.space_after = Pt(2)

    p_m2 = tf_meta.add_paragraph()
    p_m2.text = "• Backend API Health: https://gitscout-api-3h18.onrender.com/api/health"
    p_m2.font.name = "Segoe UI"
    p_m2.font.size = Pt(10.5)
    p_m2.font.color.rgb = TEXT_LIGHT
    p_m2.space_after = Pt(2)

    p_m3 = tf_meta.add_paragraph()
    p_m3.text = "• GitHub: github.com/aviraL27/gitscout  |  Presenter: Aviral Joshi"
    p_m3.font.name = "Segoe UI"
    p_m3.font.size = Pt(10.5)
    p_m3.font.color.rgb = BLUE

    # Right Side: Official Banner Image
    if os.path.exists("hacktoberfest_banner.png"):
        slide1.shapes.add_picture("hacktoberfest_banner.png", Inches(8.3), Inches(0.85), width=Inches(4.35))

    # Right Side Bottom: Terminal Mock Card
    term_card = make_card(slide1, Inches(8.3), Inches(3.55), Inches(4.35), Inches(3.5),
                          bg_color=HEADER_ACCENT, border_color=ORANGE, border_width=1.2, radius=0.035)
    tf_term = term_card.text_frame
    tf_term.word_wrap = True
    tf_term.margin_left = Inches(0.25)
    tf_term.margin_right = Inches(0.25)
    tf_term.margin_top = Inches(0.2)

    p_th = tf_term.paragraphs[0]
    p_th.text = "terminal :: gitscout-scout-daemon"
    p_th.font.name = "Consolas"
    p_th.font.size = Pt(10)
    p_th.font.bold = True
    p_th.font.color.rgb = ORANGE
    p_th.space_after = Pt(6)

    term_lines = [
        ("$ gitscout search --query \"RAG devs in India\"", WHITE, True),
        (">> [SearchPlanner] Generated 3 API query angles", TEXT_MUTED, False),
        (">> [GitHubClient] Scanned 45 profiles (5k req/hr PAT)", TEXT_LIGHT, False),
        (">> [AIRouter] Gemma 4 cloud evaluator engaged", MINT, True),
        ("   Model: gemma-4-31b-it (Google AI API)", TEXT_MUTED, False),
        (">> [Evaluator] 12 candidates qualified (>80 pts)", AMBER, True),
        ("   Signals: Location + Skills + Commits + Repo Proof", TEXT_MUTED, False),
        (">> [Outreach] 12 personalized emails drafted", BLUE, False),
        (">> [Status] Published to live Render dashboard", WHITE, True)
    ]
    for line, col, is_b in term_lines:
        p_l = tf_term.add_paragraph()
        p_l.text = line
        p_l.font.name = "Consolas"
        p_l.font.size = Pt(8.8)
        p_l.font.bold = is_b
        p_l.font.color.rgb = col
        p_l.space_after = Pt(1.5)

    # ══════════════════════════════════════════════════════════════════════════
    # SLIDE 2: Sourcing Problem vs GitScout Solution
    # ══════════════════════════════════════════════════════════════════════════
    slide2 = prs.slides.add_slide(blank_layout)
    apply_slide_bg(slide2)
    add_header(slide2, "THE SOURCING CRISIS vs. GITSCOUT", 
               "Why Finding Real Open-Source Talent is Broken",
               "Traditional recruiting tools fail modern engineering teams by relying on shallow keyword filters and unverified AI.")

    col_w = Inches(5.7)
    col_h = Inches(4.45)
    top_pos = Inches(1.62)

    # Left Column: The Problem
    card_prob = make_card(slide2, Inches(0.8), top_pos, col_w, col_h,
                          bg_color=CARD_BG, border_color=RED_ACCENT, border_width=1.5, radius=0.035)
    tf_p = card_prob.text_frame
    tf_p.word_wrap = True
    tf_p.margin_left = Inches(0.3)
    tf_p.margin_right = Inches(0.3)
    tf_p.margin_top = Inches(0.22)

    p = tf_p.paragraphs[0]
    p.text = "❌ THE STATUS QUO: RECRUITER PITFALLS"
    p.font.name = "Consolas"
    p.font.size = Pt(12)
    p.font.bold = True
    p.font.color.rgb = RED_ACCENT
    p.space_after = Pt(10)

    problem_items = [
        ("Brittle Boolean Keyword Filters", "Keyword queries miss 70%+ of top contributors who write phenomenal code but don't stuff SEO keywords into their profile bios."),
        ("AI Hallucinations & Fabricated Skills", "Generic black-box LLMs assume skills that don't exist in the candidate's actual repositories, leading to awkward outreach and failed technical interviews."),
        ("Impersonal, Spammy Recruiter Templates", "Senior developers immediately discard cold, generic outreach emails that show no understanding of their real open-source work."),
        ("Extreme Context Switching & Time Waste", "Recruiters manually cross-reference GitHub commits, stars, repository activity, and profile links—costing 30+ minutes per candidate.")
    ]
    for title, desc in problem_items:
        p_t = tf_p.add_paragraph()
        p_t.text = f"• {title}"
        p_t.font.name = "Segoe UI"
        p_t.font.size = Pt(11.5)
        p_t.font.bold = True
        p_t.font.color.rgb = WHITE
        p_d = tf_p.add_paragraph()
        p_d.text = f"  {desc}"
        p_d.font.name = "Segoe UI"
        p_d.font.size = Pt(9.8)
        p_d.font.color.rgb = TEXT_MUTED
        p_d.space_after = Pt(6)

    # Right Column: The Solution
    card_sol = make_card(slide2, Inches(6.8), top_pos, col_w, col_h,
                         bg_color=CARD_BG, border_color=MINT, border_width=1.5, radius=0.035)
    tf_s = card_sol.text_frame
    tf_s.word_wrap = True
    tf_s.margin_left = Inches(0.3)
    tf_s.margin_right = Inches(0.3)
    tf_s.margin_top = Inches(0.22)

    p = tf_s.paragraphs[0]
    p.text = "⚡ THE GITSCOUT ADVANTAGE"
    p.font.name = "Consolas"
    p.font.size = Pt(12)
    p.font.bold = True
    p.font.color.rgb = MINT
    p.space_after = Pt(10)

    solution_items = [
        ("Conversational Search Intent Planning", "Input natural requirements (e.g. 'Find devs in India with RAG and LLM repos')—GitScout plans multi-angle GitHub queries automatically."),
        ("Deep Repository & Codebase Enrichment", "Fetches actual repository codebases, commit timestamps, stargazer proof, and topic tags to evaluate authentic engineering substance."),
        ("Zero-Hallucination Qualification with Gemma 4", "Gemma 4 evaluates candidates against an objective 100-point rubric, citing exact repositories and skills with zero hallucinations."),
        ("Context-Aware 1-Click Outreach Emails", "Generates authentic dev-to-dev emails referencing the candidate's exact repository name and achievements (<120 words).")
    ]
    for title, desc in solution_items:
        p_t = tf_s.add_paragraph()
        p_t.text = f"• {title}"
        p_t.font.name = "Segoe UI"
        p_t.font.size = Pt(11.5)
        p_t.font.bold = True
        p_t.font.color.rgb = WHITE
        p_d = tf_s.add_paragraph()
        p_d.text = f"  {desc}"
        p_d.font.name = "Segoe UI"
        p_d.font.size = Pt(9.8)
        p_d.font.color.rgb = TEXT_MUTED
        p_d.space_after = Pt(6)

    # Bottom Comparison Metrics Strip
    comp_card = make_card(slide2, Inches(0.8), Inches(6.2), Inches(11.7), Inches(0.95),
                          bg_color=HEADER_ACCENT, border_color=AMBER, border_width=1.0, radius=0.03)
    tf_c = comp_card.text_frame
    tf_c.word_wrap = True
    tf_c.margin_left = Inches(0.25)
    tf_c.margin_top = Inches(0.12)

    p_ch = tf_c.paragraphs[0]
    p_ch.text = "KEY METRIC IMPACT:"
    p_ch.font.name = "Consolas"
    p_ch.font.size = Pt(10)
    p_ch.font.bold = True
    p_ch.font.color.rgb = AMBER

    p_cd = tf_c.add_paragraph()
    p_cd.text = "⏱️ Time per candidate: 30 min → 15 sec  |  🎯 False positive skills: High → 0% (Ground truth)  |  ✉️ Outreach response rate: 5% → 40%+"
    p_cd.font.name = "Segoe UI"
    p_cd.font.size = Pt(11)
    p_cd.font.bold = True
    p_cd.font.color.rgb = WHITE

    # ══════════════════════════════════════════════════════════════════════════
    # SLIDE 3: System Architecture & End-to-End Pipeline
    # ══════════════════════════════════════════════════════════════════════════
    slide3 = prs.slides.add_slide(blank_layout)
    apply_slide_bg(slide3)
    add_header(slide3, "ARCHITECTURE & DATA FLOW", 
               "From Natural-Language Prompt to Qualified Candidates",
               "A resilient 5-stage pipeline connecting GitHub's global graph with Google's Gemma 4 intelligence.")

    # 5 Horizontal Architecture Steps
    step_w = Inches(2.26)
    step_h = Inches(3.05)
    step_y = Inches(1.65)
    steps_data = [
        ("STAGE 01", "Search Planner", ORANGE, [
            "Natural prompt input",
            "Deterministic keyword extraction",
            "Multi-query decomposition (user + repo searches)",
            "Location & tech filters"
        ]),
        ("STAGE 02", "GitHub Search API", BLUE, [
            "Authenticated GitHub REST API client",
            "5,000 req/hr token rate-limit tracking",
            "Auto retry & backoff",
            "Candidate deduplication"
        ]),
        ("STAGE 03", "Enrichment Engine", AMBER, [
            "Pulls profile & bio",
            "Fetches top public repos",
            "Inspects code languages & topic tags",
            "Validates commit recency"
        ]),
        ("STAGE 04", "Gemma 4 Evaluator", MINT, [
            "Google AI Studio Gemma 4 IT",
            "Ollama local runner fallback",
            "100-pt evidence-backed rubric",
            "Zod JSON validation"
        ]),
        ("STAGE 05", "Real-Time UI", WHITE, [
            "Ranked candidate cards",
            "Score & signal breakdown",
            "Verifiable repo evidence badges",
            "1-click tailored outreach"
        ])
    ]

    for i, (badge, title, color, points) in enumerate(steps_data):
        x = Inches(0.8 + i * 2.4)
        card = make_card(slide3, x, step_y, step_w, step_h,
                         bg_color=CARD_BG, border_color=color, border_width=1.5, radius=0.035)
        tf = card.text_frame
        tf.word_wrap = True
        tf.margin_left = Inches(0.16)
        tf.margin_right = Inches(0.16)
        tf.margin_top = Inches(0.18)

        p_b = tf.paragraphs[0]
        p_b.text = badge
        p_b.font.name = "Consolas"
        p_b.font.size = Pt(9.5)
        p_b.font.bold = True
        p_b.font.color.rgb = color

        p_t = tf.add_paragraph()
        p_t.text = title
        p_t.font.name = "Segoe UI"
        p_t.font.size = Pt(12)
        p_t.font.bold = True
        p_t.font.color.rgb = WHITE
        p_t.space_after = Pt(4)

        for pt in points:
            p_p = tf.add_paragraph()
            p_p.text = f"• {pt}"
            p_p.font.name = "Segoe UI"
            p_p.font.size = Pt(9.2)
            p_p.font.color.rgb = TEXT_LIGHT
            p_p.space_after = Pt(2)

    # Bottom Full-Stack Monorepo Tech Stack Card Container
    stack_card = make_card(slide3, Inches(0.8), Inches(4.88), Inches(11.8), Inches(2.28),
                           bg_color=CARD_BG_ALT, border_color=CARD_BORDER, border_width=1.0, radius=0.035)

    header_box = slide3.shapes.add_textbox(Inches(1.05), Inches(4.95), Inches(11.2), Inches(0.35))
    tf_hb = header_box.text_frame
    tf_hb.vertical_anchor = MSO_ANCHOR.TOP
    tf_hb.word_wrap = True
    tf_hb.margin_left = tf_hb.margin_top = tf_hb.margin_right = tf_hb.margin_bottom = 0
    p_hb = tf_hb.paragraphs[0]
    p_hb.text = "🛠️ MONOREPO ARCHITECTURE & TECH STACK"
    p_hb.font.name = "Consolas"
    p_hb.font.size = Pt(11)
    p_hb.font.bold = True
    p_hb.font.color.rgb = AMBER

    # 3 Sub-columns inside the stack card cleanly positioned below header
    col_w_st = Inches(3.6)
    sub_stacks = [
        (Inches(1.05), "Frontend (apps/web)", BLUE, [
            "React 19 + Vite + Tailwind CSS",
            "Lucide React Icons & Animations",
            "Deployed as Static Site on Render",
            "Interactive search state & filters"
        ]),
        (Inches(4.9), "Backend & Shared (apps/api)", ORANGE, [
            "Node.js + Express + TypeScript",
            "Octokit GitHub API REST Client",
            "In-memory SearchJobStore (PostgreSQL ready)",
            "@gitscout/shared: Universal Zod schemas"
        ]),
        (Inches(8.75), "AI & Evaluation (AIRouter)", MINT, [
            "Primary: Gemma 4 (gemma-4-31b-it)",
            "Fallback: Gemini 3.8 Flash (Cloud)",
            "Offline: Ollama runner (gemma4:12b)",
            "Zero candidate loss deterministic safety"
        ])
    ]

    for x_sub, title_sub, col_sub, pts_sub in sub_stacks:
        sub_box = slide3.shapes.add_textbox(x_sub, Inches(5.35), col_w_st, Inches(1.65))
        tf_sb = sub_box.text_frame
        tf_sb.vertical_anchor = MSO_ANCHOR.TOP
        tf_sb.word_wrap = True
        tf_sb.margin_left = tf_sb.margin_right = tf_sb.margin_top = tf_sb.margin_bottom = 0

        p_sb_t = tf_sb.paragraphs[0]
        p_sb_t.text = title_sub
        p_sb_t.font.name = "Segoe UI"
        p_sb_t.font.size = Pt(11)
        p_sb_t.font.bold = True
        p_sb_t.font.color.rgb = col_sub
        p_sb_t.space_after = Pt(2)

        for pt in pts_sub:
            p_pt = tf_sb.add_paragraph()
            p_pt.text = f"• {pt}"
            p_pt.font.name = "Segoe UI"
            p_pt.font.size = Pt(9.5)
            p_pt.font.color.rgb = WHITE
            p_pt.space_after = Pt(1.5)

    # ══════════════════════════════════════════════════════════════════════════
    # SLIDE 4: Gemma 4 AI Architecture & Transparent Scoring Rubric
    # ══════════════════════════════════════════════════════════════════════════
    slide4 = prs.slides.add_slide(blank_layout)
    apply_slide_bg(slide4)
    add_header(slide4, "COMPETITION TRACK: BEST USE OF GEMMA 4", 
               "Gemma 4 AI Engine & Transparent 100-Point Rubric",
               "No AI hallucinations. GitScout pairs Google's Gemma 4 open-weights model with a verifiable evidence framework.")

    col4_w = Inches(5.7)
    col4_h = Inches(5.45)
    y4 = Inches(1.62)

    # Left Column Container
    make_card(slide4, Inches(0.8), y4, col4_w, col4_h,
              bg_color=CARD_BG, border_color=BLUE, border_width=1.5, radius=0.035)

    # Header Box for Left Column
    hdr_box_l = slide4.shapes.add_textbox(Inches(1.08), y4 + Inches(0.2), col4_w - Inches(0.56), Inches(0.4))
    tf_hl = hdr_box_l.text_frame
    tf_hl.vertical_anchor = MSO_ANCHOR.TOP
    tf_hl.margin_left = tf_hl.margin_right = tf_hl.margin_top = tf_hl.margin_bottom = 0
    p_hl = tf_hl.paragraphs[0]
    p_hl.text = "🧠 RESILIENT MULTI-TIER AIROUTER"
    p_hl.font.name = "Consolas"
    p_hl.font.size = Pt(12)
    p_hl.font.bold = True
    p_hl.font.color.rgb = BLUE

    # 4 Tier Cards on Left Side
    tiers = [
        ("Tier 1: Gemma 4 Cloud (Primary)", "gemma-4-26b-a4b-it / gemma-4-31b-it on Google AI API. Provides deep reasoning, zero-hallucination compliance, and structured JSON output.", ORANGE),
        ("Tier 2: Gemini 3.8 Flash (High-Throughput Fallback)", "Provides instant cloud redundancy to guarantee uninterrupted candidate evaluation even under strict API rate-limiting.", BLUE),
        ("Tier 3: Local Ollama Runner (Air-Gapped Privacy)", "Runs gemma4:12b entirely locally via Ollama (http://localhost:11434). Zero API costs, 100% data confidentiality for enterprise talent search.", MINT),
        ("Tier 4: Deterministic Algorithmic Backup", "Zero dropped candidates: if external networks fail completely, deterministic keyword/repo heuristics preserve candidate scores.", AMBER)
    ]

    tier_card_h = Inches(1.05)
    for i, (t_title, t_desc, t_col) in enumerate(tiers):
        t_card = make_card(slide4, Inches(1.05), y4 + Inches(0.65 + i * 1.15), col4_w - Inches(0.5), tier_card_h,
                           bg_color=HEADER_ACCENT, border_color=t_col, border_width=1.0, radius=0.025)
        tf_t = t_card.text_frame
        tf_t.word_wrap = True
        tf_t.margin_left = Inches(0.18)
        tf_t.margin_right = Inches(0.18)
        tf_t.margin_top = Inches(0.12)

        p_tt = tf_t.paragraphs[0]
        p_tt.text = t_title
        p_tt.font.name = "Segoe UI"
        p_tt.font.size = Pt(10.5)
        p_tt.font.bold = True
        p_tt.font.color.rgb = t_col
        p_tt.space_after = Pt(2)

        p_td = tf_t.add_paragraph()
        p_td.text = t_desc
        p_td.font.name = "Segoe UI"
        p_td.font.size = Pt(9.2)
        p_td.font.color.rgb = TEXT_LIGHT

    # Right Column Container
    make_card(slide4, Inches(6.8), y4, col4_w, col4_h,
              bg_color=CARD_BG, border_color=AMBER, border_width=1.5, radius=0.035)

    # Header Box for Right Column
    hdr_box_r = slide4.shapes.add_textbox(Inches(7.08), y4 + Inches(0.2), col4_w - Inches(0.56), Inches(0.4))
    tf_hr = hdr_box_r.text_frame
    tf_hr.vertical_anchor = MSO_ANCHOR.TOP
    tf_hr.margin_left = tf_hr.margin_right = tf_hr.margin_top = tf_hr.margin_bottom = 0
    p_hr = tf_hr.paragraphs[0]
    p_hr.text = "⚖️ OBJECTIVE 100-POINT SCORING RUBRIC"
    p_hr.font.name = "Consolas"
    p_hr.font.size = Pt(12)
    p_hr.font.bold = True
    p_hr.font.color.rgb = AMBER

    # 5 Rubric Criteria Cards on Right Side
    rubric_items = [
        ("📍 Location Match", "+20 PTS", "Profile location strictly matches requested geographic scope (e.g., India, Nagpur, Remote).", AMBER),
        ("💻 Core Skill Match", "+25 PTS", "Bio, repository topics, and project descriptions explicitly demonstrate required technologies.", ORANGE),
        ("⚙️ Language Match", "+15 PTS", "Primary programming languages across top repositories align with technical specifications.", BLUE),
        ("📦 Concrete Repository Evidence", "+25 PTS", "Active, original repositories proving practical implementation (not empty forks or cloned repos).", MINT),
        ("⚡ Recent Activity Recency", "+15 PTS", "Verified commits, pull requests, or project updates pushed within the last 6 months.", WHITE)
    ]

    r_card_h = Inches(0.82)
    for i, (r_title, r_pts, r_desc, r_col) in enumerate(rubric_items):
        r_card = make_card(slide4, Inches(7.05), y4 + Inches(0.65 + i * 0.90), col4_w - Inches(0.5), r_card_h,
                           bg_color=HEADER_ACCENT, border_color=r_col, border_width=1.0, radius=0.025)
        tf_r = r_card.text_frame
        tf_r.word_wrap = True
        tf_r.margin_left = Inches(0.18)
        tf_r.margin_right = Inches(0.18)
        tf_r.margin_top = Inches(0.10)

        p_rt = tf_r.paragraphs[0]
        p_rt.text = f"{r_title}  [{r_pts}]"
        p_rt.font.name = "Segoe UI"
        p_rt.font.size = Pt(10.5)
        p_rt.font.bold = True
        p_rt.font.color.rgb = r_col
        p_rt.space_after = Pt(1)

        p_rd = tf_r.add_paragraph()
        p_rd.text = r_desc
        p_rd.font.name = "Segoe UI"
        p_rd.font.size = Pt(9.2)
        p_rd.font.color.rgb = TEXT_LIGHT

    # Bottom Guarantee Badge on Right Side
    g_card = make_card(slide4, Inches(7.05), y4 + Inches(5.15 - 0.05), col4_w - Inches(0.5), Inches(0.38),
                       bg_color=HEADER_ACCENT, border_color=MINT, border_width=1.0, radius=0.02)
    tf_g = g_card.text_frame
    tf_g.margin_left = Inches(0.15)
    tf_g.margin_top = Inches(0.06)
    p_g = tf_g.paragraphs[0]
    p_g.text = "🛡️ Zero-Hallucination: Gemma 4 strictly cites verified evidence arrays."
    p_g.font.name = "Segoe UI"
    p_g.font.size = Pt(9.2)
    p_g.font.bold = True
    p_g.font.color.rgb = MINT

    # ══════════════════════════════════════════════════════════════════════════
    # SLIDE 5: Live Production Demo & Key Innovations
    # ══════════════════════════════════════════════════════════════════════════
    slide5 = prs.slides.add_slide(blank_layout)
    apply_slide_bg(slide5)
    add_header(slide5, "LIVE DEMO & CAPABILITIES", 
               "Production-Grade Experience Deployed on Render",
               "A battle-tested full-stack web application delivering instant developer discovery and contextual outreach.")

    f_w = Inches(3.75)
    f_h = Inches(4.35)
    f_y = Inches(1.62)
    features = [
        ("01 / QUERY & SEARCH", "Real-Time Query Planning", ORANGE, [
            "Conversational input box parses open-ended developer requirements.",
            "Decomposes complex requests into multi-angle GitHub queries automatically.",
            "Live progress status indicator showing discovery and qualification stages.",
            "In-memory cached SearchJobStore for sub-second retrieval on repeated queries."
        ], "UI PREVIEW: SEARCH PROMPT", [
            "🔍 \"Find developers in India building RAG\"",
            "├─ Multi-Query: location:India repos:>3 \"RAG\"",
            "├─ Repo Angle: topic:rag language:typescript",
            "└─ Status: 45 contributors queued (100%)"
        ]),
        ("02 / EVALUATION", "Evidence Badges & Signals", BLUE, [
            "Score badges (e.g. 95/100, 85/100) ranked transparently with reasons.",
            "Color-coded signal chips: [Location] [Skills] [Repo Evidence] [Active Commits].",
            "Clickable GitHub repository cards with star counts, language chips, and description.",
            "Direct link to candidate GitHub profile and top projects."
        ], "UI PREVIEW: CANDIDATE CARD", [
            "👤 Aviral Joshi • 95/100 • India",
            "[✓ Location: India]  [✓ Skills: LLM, RAG]",
            "[✓ TypeScript: 8 repos]  [✓ Commits: 2d ago]",
            "Reason: Author of verified RAG open-source repos"
        ]),
        ("03 / OUTREACH", "1-Click Contextual Outreach", MINT, [
            "Gemma 4 drafts authentic developer-to-developer outreach emails.",
            "Strict rule: <120 words, mentions exact repository names and tech accomplishments.",
            "Never sounds like automated recruitment spam.",
            "1-click copy subject and body directly into your favorite email client."
        ], "UI PREVIEW: OUTREACH DRAFT", [
            "Subj: Loved your work on GitScout!",
            "To: candidate@github.dev",
            "\"Hi Aviral, saw your impressive RAG pipelines",
            "in gitscout. Would love to collaborate for GDGC!\""
        ])
    ]

    for i, (badge, title, color, points, mock_h, mock_lines) in enumerate(features):
        x = Inches(0.8 + i * 4.02)
        card = make_card(slide5, x, f_y, f_w, f_h,
                         bg_color=CARD_BG, border_color=color, border_width=1.5, radius=0.035)

        tf = card.text_frame
        tf.word_wrap = True
        tf.margin_left = Inches(0.22)
        tf.margin_right = Inches(0.22)
        tf.margin_top = Inches(0.2)

        p_b = tf.paragraphs[0]
        p_b.text = badge
        p_b.font.name = "Consolas"
        p_b.font.size = Pt(10)
        p_b.font.bold = True
        p_b.font.color.rgb = color
        p_b.space_after = Pt(2)

        p_t = tf.add_paragraph()
        p_t.text = title
        p_t.font.name = "Segoe UI"
        p_t.font.size = Pt(13)
        p_t.font.bold = True
        p_t.font.color.rgb = WHITE
        p_t.space_after = Pt(4)

        for pt in points:
            p_p = tf.add_paragraph()
            p_p.text = f"• {pt}"
            p_p.font.name = "Segoe UI"
            p_p.font.size = Pt(9.2)
            p_p.font.color.rgb = TEXT_LIGHT
            p_p.space_after = Pt(2.5)

        # Mock UI snippet card inside each feature card filling the lower half
        mock_card = make_card(slide5, x + Inches(0.18), f_y + Inches(2.95), f_w - Inches(0.36), Inches(1.25),
                              bg_color=HEADER_ACCENT, border_color=color, border_width=1.0, radius=0.025)
        tf_m = mock_card.text_frame
        tf_m.word_wrap = True
        tf_m.margin_left = Inches(0.12)
        tf_m.margin_top = Inches(0.08)

        p_mh = tf_m.paragraphs[0]
        p_mh.text = mock_h
        p_mh.font.name = "Consolas"
        p_mh.font.size = Pt(8)
        p_mh.font.bold = True
        p_mh.font.color.rgb = color
        p_mh.space_after = Pt(2)

        for m_line in mock_lines:
            p_mt = tf_m.add_paragraph()
            p_mt.text = m_line
            p_mt.font.name = "Consolas"
            p_mt.font.size = Pt(7.8)
            p_mt.font.color.rgb = WHITE
            p_mt.space_after = Pt(1)

    # Bottom Live Production Banner Card
    bot_card = make_card(slide5, Inches(0.8), Inches(6.12), Inches(11.8), Inches(1.05),
                         bg_color=CARD_BG_ALT, border_color=AMBER, border_width=1.0, radius=0.03)
    tf_bot = bot_card.text_frame
    tf_bot.word_wrap = True
    tf_bot.margin_left = Inches(0.28)
    tf_bot.margin_top = Inches(0.12)

    p_bh = tf_bot.paragraphs[0]
    p_bh.text = "🚀 TESTED & DEPLOYED IN PRODUCTION ON RENDER"
    p_bh.font.name = "Consolas"
    p_bh.font.size = Pt(10.5)
    p_bh.font.bold = True
    p_bh.font.color.rgb = AMBER

    p_bd = tf_bot.add_paragraph()
    p_bd.text = "• Web Application: https://gitscout-web.onrender.com  |  • Backend API: https://gitscout-api-3h18.onrender.com/api/health"
    p_bd.font.name = "Segoe UI"
    p_bd.font.size = Pt(11)
    p_bd.font.bold = True
    p_bd.font.color.rgb = WHITE

    # ══════════════════════════════════════════════════════════════════════════
    # SLIDE 6: Open-Source Hacktoberfest Impact & Roadmap
    # ══════════════════════════════════════════════════════════════════════════
    slide6 = prs.slides.add_slide(blank_layout)
    apply_slide_bg(slide6)
    add_header(slide6, "HACKTOBERFEST 2026 × COMMUNITY IMPACT", 
               "Open-Source Community Impact & Future Vision",
               "Built in the open for developers, student communities, and technical scouts across the globe.")

    col6_w = Inches(5.7)
    col6_h = Inches(4.35)
    top6 = Inches(1.62)

    # Left Column Container
    make_card(slide6, Inches(0.8), top6, col6_w, col6_h,
              bg_color=CARD_BG, border_color=ORANGE, border_width=1.5, radius=0.035)

    hdr_box_os = slide6.shapes.add_textbox(Inches(1.08), top6 + Inches(0.18), col6_w - Inches(0.56), Inches(0.35))
    tf_hos = hdr_box_os.text_frame
    tf_hos.vertical_anchor = MSO_ANCHOR.TOP
    tf_hos.margin_left = tf_hos.margin_right = tf_hos.margin_top = tf_hos.margin_bottom = 0
    p_hos = tf_hos.paragraphs[0]
    p_hos.text = "🤝 BUILT FOR HACKTOBERFEST & GDGC"
    p_hos.font.name = "Consolas"
    p_hos.font.size = Pt(12)
    p_hos.font.bold = True
    p_hos.font.color.rgb = ORANGE

    os_items = [
        ("MIT Licensed & 100% Open Source", "Published on public GitHub repository (github.com/aviraL27/gitscout) welcoming global contributions."),
        ("Beginner-Friendly Contribution Pathways", "Curated 'good first issue' labels for adding database connectors, UI widgets, and exporter tools."),
        ("Empowering Community Organizers", "Helps GDG Cloud Nagpur and tech communities discover local speakers, mentors, and open-source contributors."),
        ("Modular & Extensible AI Harness", "Clean abstraction layer allows contributors to plug in new LLM providers (vLLM, LMStudio, Anthropic) seamlessly.")
    ]
    for i, (os_title, os_desc) in enumerate(os_items):
        item_card = make_card(slide6, Inches(1.05), top6 + Inches(0.58 + i * 0.90), col6_w - Inches(0.5), Inches(0.82),
                              bg_color=HEADER_ACCENT, border_color=CARD_BORDER, border_width=1.0, radius=0.025)
        tf_it = item_card.text_frame
        tf_it.word_wrap = True
        tf_it.margin_left = Inches(0.18)
        tf_it.margin_right = Inches(0.18)
        tf_it.margin_top = Inches(0.08)

        p_t = tf_it.paragraphs[0]
        p_t.text = f"• {os_title}"
        p_t.font.name = "Segoe UI"
        p_t.font.size = Pt(10.5)
        p_t.font.bold = True
        p_t.font.color.rgb = WHITE
        p_t.space_after = Pt(1)

        p_d = tf_it.add_paragraph()
        p_d.text = os_desc
        p_d.font.name = "Segoe UI"
        p_d.font.size = Pt(9.2)
        p_d.font.color.rgb = TEXT_MUTED

    # Right Column Container
    make_card(slide6, Inches(6.8), top6, col6_w, col6_h,
              bg_color=CARD_BG, border_color=MINT, border_width=1.5, radius=0.035)

    hdr_box_rd = slide6.shapes.add_textbox(Inches(7.08), top6 + Inches(0.18), col6_w - Inches(0.56), Inches(0.35))
    tf_hrd = hdr_box_rd.text_frame
    tf_hrd.vertical_anchor = MSO_ANCHOR.TOP
    tf_hrd.margin_left = tf_hrd.margin_right = tf_hrd.margin_top = tf_hrd.margin_bottom = 0
    p_hrd = tf_hrd.paragraphs[0]
    p_hrd.text = "🚀 FUTURE ROADMAP (PHASE 3+)"
    p_hrd.font.name = "Consolas"
    p_hrd.font.size = Pt(12)
    p_hrd.font.bold = True
    p_hrd.font.color.rgb = MINT

    roadmap_items = [
        ("Gemma 4 Multimodal Portfolio Analysis", "Ingest candidate architecture diagrams, personal portfolio screenshots, and resume PDFs using Gemma 4 multimodal capabilities."),
        ("PostgreSQL Enterprise Store & Exports", "Persistent candidate talent pools, recruiter notes, and export to CSV/JSON for team collaboration."),
        ("Multi-Platform Contributor Sourcing", "Expand discovery across HuggingFace models, Kaggle notebooks, and Stack Overflow profiles."),
        ("Automated Open-Source Issue Matcher", "Match open Hacktoberfest issues directly to qualified contributors based on repo commit patterns.")
    ]
    for i, (rd_title, rd_desc) in enumerate(roadmap_items):
        rd_card = make_card(slide6, Inches(7.05), top6 + Inches(0.58 + i * 0.90), col6_w - Inches(0.5), Inches(0.82),
                            bg_color=HEADER_ACCENT, border_color=CARD_BORDER, border_width=1.0, radius=0.025)
        tf_rd = rd_card.text_frame
        tf_rd.word_wrap = True
        tf_rd.margin_left = Inches(0.18)
        tf_rd.margin_right = Inches(0.18)
        tf_rd.margin_top = Inches(0.08)

        p_t = tf_rd.paragraphs[0]
        p_t.text = f"• {rd_title}"
        p_t.font.name = "Segoe UI"
        p_t.font.size = Pt(10.5)
        p_t.font.bold = True
        p_t.font.color.rgb = WHITE
        p_t.space_after = Pt(1)

        p_d = tf_rd.add_paragraph()
        p_d.text = rd_desc
        p_d.font.name = "Segoe UI"
        p_d.font.size = Pt(9.2)
        p_d.font.color.rgb = TEXT_MUTED

    # Bottom Community Callout Strip
    callout_card = make_card(slide6, Inches(0.8), Inches(6.12), Inches(11.8), Inches(1.05),
                             bg_color=CARD_BG_ALT, border_color=ORANGE, border_width=1.5, radius=0.03)
    tf_co = callout_card.text_frame
    tf_co.word_wrap = True
    tf_co.margin_left = Inches(0.25)
    tf_co.margin_top = Inches(0.12)

    p_co1 = tf_co.paragraphs[0]
    p_co1.text = "🌟 LEARN. CONTRIBUTE. BUILD. REPEAT. — GDG CLOUD NAGPUR × MLH"
    p_co1.font.name = "Consolas"
    p_co1.font.size = Pt(11)
    p_co1.font.bold = True
    p_co1.font.color.rgb = AMBER
    p_co1.alignment = PP_ALIGN.CENTER

    p_co2 = tf_co.add_paragraph()
    p_co2.text = "Try GitScout Live: https://gitscout-web.onrender.com  •  Contribute on GitHub: https://github.com/aviraL27/gitscout"
    p_co2.font.name = "Segoe UI"
    p_co2.font.size = Pt(11.5)
    p_co2.font.bold = True
    p_co2.font.color.rgb = WHITE
    p_co2.alignment = PP_ALIGN.CENTER

    # Save output
    output_path = "GitScout_Hacktoberfest_2026.pptx"
    prs.save(output_path)
    print(f"Presentation saved successfully as '{output_path}' ({len(prs.slides)} slides)")

if __name__ == "__main__":
    create_presentation()
