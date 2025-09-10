import { onRequestOptions as __api_auth_login_ts_onRequestOptions } from "/Users/zeidalqadri/Desktop/mstprmpt/zeidgeist-prompter/functions/api/auth/login.ts"
import { onRequestPost as __api_auth_login_ts_onRequestPost } from "/Users/zeidalqadri/Desktop/mstprmpt/zeidgeist-prompter/functions/api/auth/login.ts"
import { onRequestGet as __api_auth_mfa_ts_onRequestGet } from "/Users/zeidalqadri/Desktop/mstprmpt/zeidgeist-prompter/functions/api/auth/mfa.ts"
import { onRequestOptions as __api_auth_mfa_ts_onRequestOptions } from "/Users/zeidalqadri/Desktop/mstprmpt/zeidgeist-prompter/functions/api/auth/mfa.ts"
import { onRequestPost as __api_auth_mfa_ts_onRequestPost } from "/Users/zeidalqadri/Desktop/mstprmpt/zeidgeist-prompter/functions/api/auth/mfa.ts"
import { onRequestOptions as __api_auth_register_ts_onRequestOptions } from "/Users/zeidalqadri/Desktop/mstprmpt/zeidgeist-prompter/functions/api/auth/register.ts"
import { onRequestPost as __api_auth_register_ts_onRequestPost } from "/Users/zeidalqadri/Desktop/mstprmpt/zeidgeist-prompter/functions/api/auth/register.ts"
import { onRequestOptions as __api_engineer_feedback_ts_onRequestOptions } from "/Users/zeidalqadri/Desktop/mstprmpt/zeidgeist-prompter/functions/api/engineer/feedback.ts"
import { onRequestPost as __api_engineer_feedback_ts_onRequestPost } from "/Users/zeidalqadri/Desktop/mstprmpt/zeidgeist-prompter/functions/api/engineer/feedback.ts"
import { onRequestGet as __api_engineer_history_ts_onRequestGet } from "/Users/zeidalqadri/Desktop/mstprmpt/zeidgeist-prompter/functions/api/engineer/history.ts"
import { onRequestOptions as __api_engineer_history_ts_onRequestOptions } from "/Users/zeidalqadri/Desktop/mstprmpt/zeidgeist-prompter/functions/api/engineer/history.ts"
import { onRequestPost as __api_engineer_history_ts_onRequestPost } from "/Users/zeidalqadri/Desktop/mstprmpt/zeidgeist-prompter/functions/api/engineer/history.ts"
import { onRequestGet as __api_engineer_history_dual_mode_ts_onRequestGet } from "/Users/zeidalqadri/Desktop/mstprmpt/zeidgeist-prompter/functions/api/engineer/history-dual-mode.ts"
import { onRequestOptions as __api_engineer_history_dual_mode_ts_onRequestOptions } from "/Users/zeidalqadri/Desktop/mstprmpt/zeidgeist-prompter/functions/api/engineer/history-dual-mode.ts"
import { onRequestPost as __api_engineer_history_dual_mode_ts_onRequestPost } from "/Users/zeidalqadri/Desktop/mstprmpt/zeidgeist-prompter/functions/api/engineer/history-dual-mode.ts"
import { onRequestGet as __api_health_liveness_ts_onRequestGet } from "/Users/zeidalqadri/Desktop/mstprmpt/zeidgeist-prompter/functions/api/health/liveness.ts"
import { onRequestGet as __api_health_readiness_ts_onRequestGet } from "/Users/zeidalqadri/Desktop/mstprmpt/zeidgeist-prompter/functions/api/health/readiness.ts"
import { onRequestGet as __api_learning_status_ts_onRequestGet } from "/Users/zeidalqadri/Desktop/mstprmpt/zeidgeist-prompter/functions/api/learning/status.ts"
import { onRequestOptions as __api_learning_status_ts_onRequestOptions } from "/Users/zeidalqadri/Desktop/mstprmpt/zeidgeist-prompter/functions/api/learning/status.ts"
import { onRequestOptions as __api_learning_trigger_ts_onRequestOptions } from "/Users/zeidalqadri/Desktop/mstprmpt/zeidgeist-prompter/functions/api/learning/trigger.ts"
import { onRequestPost as __api_learning_trigger_ts_onRequestPost } from "/Users/zeidalqadri/Desktop/mstprmpt/zeidgeist-prompter/functions/api/learning/trigger.ts"
import { onRequestDelete as __api_privacy_dsar_ts_onRequestDelete } from "/Users/zeidalqadri/Desktop/mstprmpt/zeidgeist-prompter/functions/api/privacy/dsar.ts"
import { onRequestGet as __api_privacy_dsar_ts_onRequestGet } from "/Users/zeidalqadri/Desktop/mstprmpt/zeidgeist-prompter/functions/api/privacy/dsar.ts"
import { onRequestOptions as __api_privacy_dsar_ts_onRequestOptions } from "/Users/zeidalqadri/Desktop/mstprmpt/zeidgeist-prompter/functions/api/privacy/dsar.ts"
import { onRequestPost as __api_privacy_dsar_ts_onRequestPost } from "/Users/zeidalqadri/Desktop/mstprmpt/zeidgeist-prompter/functions/api/privacy/dsar.ts"
import { onRequestOptions as __api_engineer_ts_onRequestOptions } from "/Users/zeidalqadri/Desktop/mstprmpt/zeidgeist-prompter/functions/api/engineer.ts"
import { onRequestPost as __api_engineer_ts_onRequestPost } from "/Users/zeidalqadri/Desktop/mstprmpt/zeidgeist-prompter/functions/api/engineer.ts"
import { onRequestGet as __api_health_index_ts_onRequestGet } from "/Users/zeidalqadri/Desktop/mstprmpt/zeidgeist-prompter/functions/api/health/index.ts"

export const routes = [
    {
      routePath: "/api/auth/login",
      mountPath: "/api/auth",
      method: "OPTIONS",
      middlewares: [],
      modules: [__api_auth_login_ts_onRequestOptions],
    },
  {
      routePath: "/api/auth/login",
      mountPath: "/api/auth",
      method: "POST",
      middlewares: [],
      modules: [__api_auth_login_ts_onRequestPost],
    },
  {
      routePath: "/api/auth/mfa",
      mountPath: "/api/auth",
      method: "GET",
      middlewares: [],
      modules: [__api_auth_mfa_ts_onRequestGet],
    },
  {
      routePath: "/api/auth/mfa",
      mountPath: "/api/auth",
      method: "OPTIONS",
      middlewares: [],
      modules: [__api_auth_mfa_ts_onRequestOptions],
    },
  {
      routePath: "/api/auth/mfa",
      mountPath: "/api/auth",
      method: "POST",
      middlewares: [],
      modules: [__api_auth_mfa_ts_onRequestPost],
    },
  {
      routePath: "/api/auth/register",
      mountPath: "/api/auth",
      method: "OPTIONS",
      middlewares: [],
      modules: [__api_auth_register_ts_onRequestOptions],
    },
  {
      routePath: "/api/auth/register",
      mountPath: "/api/auth",
      method: "POST",
      middlewares: [],
      modules: [__api_auth_register_ts_onRequestPost],
    },
  {
      routePath: "/api/engineer/feedback",
      mountPath: "/api/engineer",
      method: "OPTIONS",
      middlewares: [],
      modules: [__api_engineer_feedback_ts_onRequestOptions],
    },
  {
      routePath: "/api/engineer/feedback",
      mountPath: "/api/engineer",
      method: "POST",
      middlewares: [],
      modules: [__api_engineer_feedback_ts_onRequestPost],
    },
  {
      routePath: "/api/engineer/history",
      mountPath: "/api/engineer",
      method: "GET",
      middlewares: [],
      modules: [__api_engineer_history_ts_onRequestGet],
    },
  {
      routePath: "/api/engineer/history",
      mountPath: "/api/engineer",
      method: "OPTIONS",
      middlewares: [],
      modules: [__api_engineer_history_ts_onRequestOptions],
    },
  {
      routePath: "/api/engineer/history",
      mountPath: "/api/engineer",
      method: "POST",
      middlewares: [],
      modules: [__api_engineer_history_ts_onRequestPost],
    },
  {
      routePath: "/api/engineer/history-dual-mode",
      mountPath: "/api/engineer",
      method: "GET",
      middlewares: [],
      modules: [__api_engineer_history_dual_mode_ts_onRequestGet],
    },
  {
      routePath: "/api/engineer/history-dual-mode",
      mountPath: "/api/engineer",
      method: "OPTIONS",
      middlewares: [],
      modules: [__api_engineer_history_dual_mode_ts_onRequestOptions],
    },
  {
      routePath: "/api/engineer/history-dual-mode",
      mountPath: "/api/engineer",
      method: "POST",
      middlewares: [],
      modules: [__api_engineer_history_dual_mode_ts_onRequestPost],
    },
  {
      routePath: "/api/health/liveness",
      mountPath: "/api/health",
      method: "GET",
      middlewares: [],
      modules: [__api_health_liveness_ts_onRequestGet],
    },
  {
      routePath: "/api/health/readiness",
      mountPath: "/api/health",
      method: "GET",
      middlewares: [],
      modules: [__api_health_readiness_ts_onRequestGet],
    },
  {
      routePath: "/api/learning/status",
      mountPath: "/api/learning",
      method: "GET",
      middlewares: [],
      modules: [__api_learning_status_ts_onRequestGet],
    },
  {
      routePath: "/api/learning/status",
      mountPath: "/api/learning",
      method: "OPTIONS",
      middlewares: [],
      modules: [__api_learning_status_ts_onRequestOptions],
    },
  {
      routePath: "/api/learning/trigger",
      mountPath: "/api/learning",
      method: "OPTIONS",
      middlewares: [],
      modules: [__api_learning_trigger_ts_onRequestOptions],
    },
  {
      routePath: "/api/learning/trigger",
      mountPath: "/api/learning",
      method: "POST",
      middlewares: [],
      modules: [__api_learning_trigger_ts_onRequestPost],
    },
  {
      routePath: "/api/privacy/dsar",
      mountPath: "/api/privacy",
      method: "DELETE",
      middlewares: [],
      modules: [__api_privacy_dsar_ts_onRequestDelete],
    },
  {
      routePath: "/api/privacy/dsar",
      mountPath: "/api/privacy",
      method: "GET",
      middlewares: [],
      modules: [__api_privacy_dsar_ts_onRequestGet],
    },
  {
      routePath: "/api/privacy/dsar",
      mountPath: "/api/privacy",
      method: "OPTIONS",
      middlewares: [],
      modules: [__api_privacy_dsar_ts_onRequestOptions],
    },
  {
      routePath: "/api/privacy/dsar",
      mountPath: "/api/privacy",
      method: "POST",
      middlewares: [],
      modules: [__api_privacy_dsar_ts_onRequestPost],
    },
  {
      routePath: "/api/engineer",
      mountPath: "/api",
      method: "OPTIONS",
      middlewares: [],
      modules: [__api_engineer_ts_onRequestOptions],
    },
  {
      routePath: "/api/engineer",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_engineer_ts_onRequestPost],
    },
  {
      routePath: "/api/health",
      mountPath: "/api/health",
      method: "GET",
      middlewares: [],
      modules: [__api_health_index_ts_onRequestGet],
    },
  ]