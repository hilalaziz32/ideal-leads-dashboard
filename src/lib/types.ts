export interface OrderLead {
  id: string
  contact_name: string | null
  contact_email: string | null
  contact_phone: string | null
  source: string | null
  referral_id: string | null
  assigned_to: string | null
  deal_value: number
  current_stage: string
  service_type: string | null
  executive: string | null
  message: string | null
  notes: string | null
  docs: string | null
  meeting_url: string | null
  questions: QuestionAnswer[]
  slack_channel_josh: string | null
  slack_channel_approval: string | null
  slack_channel_lead: string | null
  context_url: string | null
  created_at: string
  updated_at: string
}

export interface QuestionAnswer {
  question: string
  answer: string
}

export interface PipelineStage {
  id: string
  lead_id: string
  stage: string
  moved_by: string | null
  entered_at: string
  exited_at: string | null
  metadata: Record<string, boolean | string | number>
  slack_thread_ts: string | null
  slack_thread_approval_ts: string | null
  slack_thread_lead_ts: string | null
  asana_task_id: string | null
  ghl_opportunity_id: string | null
}

export interface PipelineStageConfig {
  stage: string
  label: string
  sequence_order: number
  default_sla_days: number | null
  post_to_josh: boolean
  post_to_approval: boolean
  post_to_lead_channel: boolean
  requires_vote: boolean
  vote_threshold: number
  reminder_interval_hours: number
}

export interface PipelineStageChecklistConfig {
  id: string
  stage: string
  key: string
  label: string
  required: boolean
  sequence_order: number
}

export interface PipelineStageDueDate {
  id: string
  lead_id: string
  stage: string
  due_at: string
  set_by: string | null
  created_at: string
  updated_at: string
}

export interface PipelineVote {
  id: string
  lead_id: string
  stage: string
  voter_slack_id: string
  voter_name: string | null
  vote: 'approve' | 'reject'
  reason: string | null
  voted_at: string
}

export interface ChecklistItemState {
  key: string
  label: string
  required: boolean
  sequence_order: number
  done: boolean
}

export interface LeadWithOverdue extends OrderLead {
  is_overdue: boolean
  due_date: PipelineStageDueDate | null
  stage_label: string
}
