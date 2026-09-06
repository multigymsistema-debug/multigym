export type AssistantDecision={shouldRespond:boolean;responseType:'CHAT_RESPONSE'|'EVENT_FEEDBACK'|'INSIGHT'|'QUESTION'|'SILENT';priority:'low'|'normal'|'high';reason:string};
export function decideAssistantAction(input:{assistant:'nutrigym'|'personalgym';intent:string;event?:any;context?:any;history?:any[]}):AssistantDecision{
  const event=String(input.event?.event_type||input.event?.type||'');
  if(input.intent==='SAFETY'||input.intent==='PROFESSIONAL_REFERRAL')return {shouldRespond:true,responseType:'CHAT_RESPONSE',priority:'high',reason:'safety_or_referral'};
  if(input.intent==='QUESTION'||input.intent==='RECOMMENDATION'||input.intent==='PROGRESS'||input.intent==='DAILY_SUMMARY'||input.intent==='WORKOUT_INFO'||input.intent==='EXERCISE_TECHNIQUE'||input.intent==='TRAINING_PROGRESS'||input.intent==='NEXT_WORKOUT')return {shouldRespond:true,responseType:'CHAT_RESPONSE',priority:'normal',reason:'student_requested_response'};
  if(event==='WORKOUT_COMPLETED'||event==='NEW_WORKOUT_AVAILABLE')return {shouldRespond:true,responseType:'EVENT_FEEDBACK',priority:'normal',reason:'important_training_event'};
  if(event==='WORKOUT_STARTED'||event==='EXERCISE_COMPLETED')return {shouldRespond:true,responseType:'EVENT_FEEDBACK',priority:'low',reason:'session_progress'};
  if(event==='SET_COMPLETED')return {shouldRespond:false,responseType:'SILENT',priority:'low',reason:'avoid_set_feedback_spam'};
  if(event==='HYDRATION_LOW'){
    const lastReminder=Number(input.context?.last_hydration_reminder_at||0),hours=(Date.now()-lastReminder)/3600000;
    return hours>=3?{shouldRespond:true,responseType:'INSIGHT',priority:'low',reason:'hydration_below_goal'}:{shouldRespond:false,responseType:'SILENT',priority:'low',reason:'recent_hydration_reminder'};
  }
  return {shouldRespond:false,responseType:'SILENT',priority:'low',reason:'no_useful_action'};
}
