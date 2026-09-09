"use client";

import { createClient } from "@/lib/supabase/client";

export type LevelingCalendarRow = {
  id: string;
  revision_id: string;
  leveling_number: number;
  lesson_id: string;
  lesson_title: string;
  lesson_slug: string;
  subject_name: string;
  subject_slug: string;
  recommended_for: string;
  scheduled_for: string | null;
  status: "draft" | "scheduled" | "in_progress" | "completed";
  attempt_id: string | null;
  required_count: number;
  required_correct: number;
};

export async function loadLevelingCalendar() {
  const supabase=createClient();
  const {data,error}=await supabase.rpc("get_leveling_calendar");
  if(error)throw error;
  return data as {events:LevelingCalendarRow[]};
}

export async function scheduleLeveling(id:string,date:string){
  const supabase=createClient();
  const {data,error}=await supabase.rpc("set_leveling_schedule",{p_leveling_id:id,p_date:date});
  if(error)throw error;
  return data as {id:string;scheduled_for:string;status:string};
}

export async function startScheduledLeveling(id:string){
  const supabase=createClient();
  const {data,error}=await supabase.rpc("start_leveling_calendar_attempt",{p_leveling_id:id});
  if(error)throw error;
  return data as {ok:boolean;attempt_id:string;continued:boolean;required_count:number;required_correct:number};
}
