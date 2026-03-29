// HELM Order Intake Questions — parsed from CSV
// Groups: customer_questions, talking_points, josh_post_intake, ea_checklist, pm_questions, sales_questions

export interface IntakeQuestion {
  id: string          // e.g. "1.1"
  label: string       // short label e.g. "Responsibilities?"
  prompt: string      // full prompt shown to Josh
  group: string       // group key
  required?: boolean
}

export interface IntakeGroup {
  key: string
  title: string
  questions: IntakeQuestion[]
}

export const INTAKE_GROUPS: IntakeGroup[] = [
  {
    key: 'customer',
    title: '1. Customer & Company Questions',
    questions: [
      { id: '1', label: 'Company name', prompt: '[XYZ] the correct URL?', group: 'customer' },
      { id: '1.1', label: 'Responsibilities', prompt: 'What are the responsibilities?', group: 'customer' },
      { id: '1.2', label: 'Existing JD?', prompt: 'Is there an existing JD?', group: 'customer' },
      { id: '1.3', label: 'Weekly hours', prompt: 'Hours/wk or range? 20 is the minimum and they have to pay for it whether they use them or not.', group: 'customer' },
      { id: '1.4', label: 'Max pay?', prompt: 'I envision a role like this running $X–$Y. Does that sound OK?', group: 'customer' },
      { id: '1.5', label: 'Client budget', prompt: 'Have you budgeted for this role? (If startup, see inserted note)', group: 'customer' },
      { id: '1.6', label: 'Certifications?', prompt: 'Are there any certifications needed?', group: 'customer' },
      { id: '1.7', label: 'English level?', prompt: "Is an accent ok or do they need to sound like they're from the U.S.?", group: 'customer' },
      { id: '1.8', label: 'Career path?', prompt: 'What kind of growth trajectory can they see for this role?', group: 'customer' },
      { id: '1.9', label: 'Actively recruiting?', prompt: 'Have you engaged anyone else or are you yourselves trying to fill this role? (For Quilt — is your internal team recruiting for this role? If so, how long before you expect to find someone?)', group: 'customer' },
      { id: '1.10', label: 'Number of roles?', prompt: 'Are they hiring for more than 1 role?', group: 'customer' },
      { id: '1.11', label: 'Readiness?', prompt: "Have hiring manager, CEO and the CFO committed to this role? I'll need to speak with the person IN the company closest to this hire.", group: 'customer', required: true },
      { id: '1.12', label: 'Manager', prompt: "Who's the manager and when can I speak with them? I need a deeper understanding of the role.", group: 'customer', required: true },
      { id: '1.13', label: 'Remote?', prompt: 'Have they ever worked with someone like this (remote) before?', group: 'customer' },
      { id: '1.14', label: 'Qualities?', prompt: 'Are there any qualities that are especially important to have or to avoid?', group: 'customer' },
      { id: '1.15', label: 'Tools?', prompt: 'What tools or software are used in the role?', group: 'customer' },
      { id: '1.16', label: 'Goals / KPIs', prompt: 'Are they clear on the metrics this person would have?', group: 'customer' },
      { id: '1.17', label: 'Reports to?', prompt: 'Who would this role report to?', group: 'customer', required: true },
      { id: '1.18', label: 'Increasing hours?', prompt: 'Any notion as to whether and when the hours may increase?', group: 'customer' },
      { id: '1.19', label: 'Culture fit?', prompt: 'What personality are they looking for? How would you describe your culture?', group: 'customer' },
      { id: '1.20', label: '48 hr timeframe', prompt: 'Will you meet a candidate within 24–48 hours of when we introduce them to you?', group: 'customer', required: true },
      { id: '1.21', label: 'Interview process?', prompt: 'Someone else they should meet? Possible to meet within 48 hours?', group: 'customer' },
      { id: '1.22', label: 'Hiring decision timeframe', prompt: "Our MO is that within 48 hours of the interview, a decision is made and there is sign-off (explain A-players move fast). Does that sound feasible for you?", group: 'customer' },
      { id: '1.23', label: 'How pricing works', prompt: 'As far as how our pricing works, it\'s very simple — you pay by hour for the time you use. You pay us and we pay the person.', group: 'customer' },
      { id: '1.24', label: 'No buyout', prompt: 'This is a permanent arrangement.', group: 'customer' },
      { id: '1.25', label: '1-year raise', prompt: "We'll ask about the possibility of a raise for the staffer at the 1-year mark.", group: 'customer' },
      { id: '1.26', label: 'For SDRs only', prompt: 'Would you consider $5/hr more for an interstellar candidate?', group: 'customer' },
      { id: '1.27', label: 'Cancellation fee?', prompt: 'Are they willing to pay $250 if they cancel the order?', group: 'customer' },
      { id: '1.28', label: 'Up-front fee', prompt: "If they've been a 'bad client' in the past, we'll charge a fee of $1,000 up front.", group: 'customer' },
    ],
  },
  {
    key: 'talking_points',
    title: '3. Talking Points',
    questions: [
      { id: '3.1', label: 'If hiring an SDR', prompt: 'Clarify what they can expect from us and what we expect from them.', group: 'talking_points' },
      { id: '3.2', label: 'Confirm with team', prompt: "Let me speak with our recruiting team to confirm when we can plan to have a candidate for you.", group: 'talking_points' },
      { id: '3.3', label: 'Wait period', prompt: "[If we're at capacity] Announce there's a wait period before getting their order started.", group: 'talking_points' },
      { id: '3.4', label: 'Onboarding checklist', prompt: "We require clients to onboard our staffers using this checklist. We'll guide and help them through it.", group: 'talking_points' },
      { id: '3.5', label: 'Our process', prompt: 'Take client through the presentation (Prezi, client deck).', group: 'talking_points' },
      { id: '3.6', label: 'If hesitancy', prompt: 'Highlight the benefits of overseas staff more — no paid holidays, no overhead, no legal or administrative mess. [California clients love us]', group: 'talking_points' },
    ],
  },
  {
    key: 'josh_post_intake',
    title: '4. Josh – Post Intake (Fill After Call)',
    questions: [
      { id: '4.1', label: 'Loom link', prompt: 'Loom link for this order', group: 'josh_post_intake' },
      { id: '4.2', label: 'Key requirements', prompt: 'Key requirements for the role', group: 'josh_post_intake', required: true },
      { id: '4.4', label: 'Test score needed', prompt: '# test score needed', group: 'josh_post_intake' },
      { id: '4.5', label: 'Spoken English level', prompt: 'Spoken English level required', group: 'josh_post_intake', required: true },
      { id: '4.6', label: 'Written English level', prompt: 'Written English level required', group: 'josh_post_intake', required: true },
      { id: '4.7', label: 'Assessment', prompt: 'Assessment for the role', group: 'josh_post_intake' },
      { id: '4.8', label: 'Rate confirmed', prompt: 'Rate client confirmed', group: 'josh_post_intake', required: true },
    ],
  },
  {
    key: 'ea_checklist',
    title: '5. Executive Assistant Checklist',
    questions: [
      { id: '5.1', label: 'Emails', prompt: 'Emails: Zero inbox. Screen. Respond. Draft.', group: 'ea_checklist' },
      { id: '5.2', label: 'Calendar', prompt: 'Set up Meetings / Optimize calendar', group: 'ea_checklist' },
      { id: '5.3', label: 'Facilitate meetings', prompt: 'Facilitate meetings', group: 'ea_checklist' },
      { id: '5.4', label: 'Meeting minutes', prompt: 'Take meeting minutes', group: 'ea_checklist' },
      { id: '5.5', label: 'Bill pay', prompt: 'Bill pay — processing bills', group: 'ea_checklist' },
      { id: '5.6', label: 'Leadership support', prompt: 'Support your leadership team or liaise between you and team members', group: 'ea_checklist' },
      { id: '5.7', label: 'Phone', prompt: 'Phone: screen calls, make calls', group: 'ea_checklist' },
      { id: '5.8', label: 'Social media', prompt: 'Social media management', group: 'ea_checklist' },
      { id: '5.9', label: 'Project management', prompt: 'Project Mgmt: vendors, clients, internal', group: 'ea_checklist' },
      { id: '5.10', label: 'Presentations', prompt: 'Presentations: create, graphs, collate info', group: 'ea_checklist' },
      { id: '5.11', label: 'Spreadsheets', prompt: 'Spreadsheets: gather data, format', group: 'ea_checklist' },
      { id: '5.12', label: 'Reports', prompt: 'Creating basic reports', group: 'ea_checklist' },
      { id: '5.13', label: 'Travel', prompt: 'Travel: Book travel / make other reservations', group: 'ea_checklist' },
      { id: '5.14', label: 'Doc management', prompt: 'Doc Mgmt: Expense reports, invoicing, intranet', group: 'ea_checklist' },
      { id: '5.15', label: 'Data entry', prompt: 'Data Entry: CRM, ERP, lists, surveys', group: 'ea_checklist' },
      { id: '5.16', label: 'Research', prompt: 'Research', group: 'ea_checklist' },
      { id: '5.17', label: 'Customer service', prompt: 'Customer service', group: 'ea_checklist' },
      { id: '5.18', label: 'Email blasts', prompt: 'Email blasts', group: 'ea_checklist' },
      { id: '5.19', label: 'Shopping', prompt: 'Shopping: researching lowest price for software, office supplies, gifts', group: 'ea_checklist' },
      { id: '5.20', label: 'Outreach Specialist', prompt: 'Outreach Specialist responsibilities', group: 'ea_checklist' },
      { id: '5.21', label: 'Lead Generation', prompt: 'Lead Generation Expert responsibilities', group: 'ea_checklist' },
      { id: '5.22', label: 'Community Manager', prompt: 'Online Community Manager responsibilities', group: 'ea_checklist' },
      { id: '5.23', label: 'Podcast Management', prompt: 'Podcast Management responsibilities', group: 'ea_checklist' },
      { id: '5.24', label: 'Tradeshows', prompt: 'Tradeshows responsibilities', group: 'ea_checklist' },
      { id: '5.25', label: 'Personal matters', prompt: 'Personal Matters (paying caregivers, setting up appointments etc.)', group: 'ea_checklist' },
      { id: '5.26', label: 'Transcription', prompt: 'Transcription (transcribing voicemail, video or audio, podcasts etc.)', group: 'ea_checklist' },
    ],
  },
  {
    key: 'pm_questions',
    title: '6. Project Manager Questions',
    questions: [
      { id: '6.1', label: 'Project types', prompt: 'What type of projects will the PM manage?', group: 'pm_questions' },
      { id: '6.2', label: 'Project stage', prompt: 'What stage of the project is the PM coming in at?', group: 'pm_questions' },
    ],
  },
  {
    key: 'sales_questions',
    title: '7. Sales Questions',
    questions: [
      { id: '7.1', label: 'Geographic location', prompt: 'Is any geographic location relevant?', group: 'sales_questions' },
    ],
  },
]

// Flat list for lookup
export const ALL_INTAKE_QUESTIONS = INTAKE_GROUPS.flatMap((g) => g.questions)
