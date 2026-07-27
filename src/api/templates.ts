import { supabase } from '../lib/supabase'
import type { Tables, TablesInsert, TablesUpdate } from '../types/database'

export type TemplateRow = Tables<'project_templates'>
export type TemplateStageRow = Tables<'template_stages'>
export type TemplateTaskRow = Tables<'template_tasks'>

export interface TemplateStageDetail extends TemplateStageRow {
  tasks: TemplateTaskRow[]
}

/** A template with its whole pipeline — what the editor and the picker both need. */
export interface TemplateDetail extends TemplateRow {
  service: { id: string; name: string; slug: string; color: string } | null
  stages: TemplateStageDetail[]
}

// Single literal: supabase-js infers the response type from it.
const TEMPLATE_SELECT =
  '*,service:services(id,name,slug,color),stages:template_stages(*,tasks:template_tasks(*))'

/** Sorts the nested pipeline; PostgREST can't order embedded rows two levels deep. */
function shapeTemplate(row: TemplateDetail): TemplateDetail {
  return {
    ...row,
    stages: [...row.stages]
      .sort((a, b) => a.order_index - b.order_index)
      .map((s) => ({ ...s, tasks: [...s.tasks].sort((a, b) => a.order_index - b.order_index) })),
  }
}

/** Templates owned by a team. RLS returns nothing unless you may manage them. */
export async function fetchTeamTemplates(teamId: string): Promise<TemplateDetail[]> {
  const { data, error } = await supabase
    .from('project_templates')
    .select(TEMPLATE_SELECT)
    .eq('team_id', teamId)
    .order('name')
  if (error) throw error
  return data.map(shapeTemplate)
}

/**
 * Every template the signed-in user may use, for the project-creation picker.
 * RLS already limits this to their own teams (or all of them for admins).
 */
export async function fetchUsableTemplates(): Promise<TemplateDetail[]> {
  const { data, error } = await supabase
    .from('project_templates')
    .select(TEMPLATE_SELECT)
    .order('name')
  if (error) throw error
  return data.map(shapeTemplate)
}

export async function createTemplate(payload: TablesInsert<'project_templates'>): Promise<TemplateRow> {
  const { data: auth } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('project_templates')
    .insert({ ...payload, created_by: payload.created_by ?? auth.user?.id ?? null })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateTemplate(id: string, updates: TablesUpdate<'project_templates'>): Promise<TemplateRow> {
  const { data, error } = await supabase.from('project_templates').update(updates).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deleteTemplate(id: string): Promise<void> {
  const { error } = await supabase.from('project_templates').delete().eq('id', id)
  if (error) throw error
}

/* ── Stages ─────────────────────────────────────────────────────────────────── */

export async function createTemplateStage(payload: TablesInsert<'template_stages'>): Promise<TemplateStageRow> {
  const { data, error } = await supabase.from('template_stages').insert(payload).select().single()
  if (error) throw error
  return data
}

export async function updateTemplateStage(
  id: string, updates: TablesUpdate<'template_stages'>,
): Promise<TemplateStageRow> {
  const { data, error } = await supabase.from('template_stages').update(updates).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deleteTemplateStage(id: string): Promise<void> {
  const { error } = await supabase.from('template_stages').delete().eq('id', id)
  if (error) throw error
}

/* ── Tasks ──────────────────────────────────────────────────────────────────── */

export async function createTemplateTask(payload: TablesInsert<'template_tasks'>): Promise<TemplateTaskRow> {
  const { data, error } = await supabase.from('template_tasks').insert(payload).select().single()
  if (error) throw error
  return data
}

export async function updateTemplateTask(
  id: string, updates: TablesUpdate<'template_tasks'>,
): Promise<TemplateTaskRow> {
  const { data, error } = await supabase.from('template_tasks').update(updates).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deleteTemplateTask(id: string): Promise<void> {
  const { error } = await supabase.from('template_tasks').delete().eq('id', id)
  if (error) throw error
}

/* ── Applying ───────────────────────────────────────────────────────────────── */

export interface TemplateApplyResult { stages_created: number; tasks_created: number }

/**
 * Copies a template's pipeline into one service block of a project. The RPC
 * checks the template is yours, the service matches, and appends after whatever
 * stages already exist.
 */
export async function applyTemplateToService(
  projectServiceId: string, templateId: string,
): Promise<TemplateApplyResult> {
  const { data, error } = await supabase.rpc('apply_template_to_service', {
    p_project_service_id: projectServiceId,
    p_template_id: templateId,
  })
  if (error) throw error
  return data?.[0] ?? { stages_created: 0, tasks_created: 0 }
}
