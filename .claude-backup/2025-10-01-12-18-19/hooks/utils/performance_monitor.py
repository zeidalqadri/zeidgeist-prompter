#!/usr/bin/env python3
"""
Performance monitoring dashboard for security hooks.
Provides real-time performance metrics and optimization insights.
"""

import sqlite3
import json
from pathlib import Path
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from performance_cache import get_cache_stats, get_performance_report


class PerformanceDashboard:
    """Real-time performance monitoring dashboard for security hooks."""
    
    def __init__(self):
        self.db_path = Path('.claude/logs/performance.sqlite')
    
    def get_hook_performance_summary(self, hours: int = 24) -> Dict:
        """Get performance summary for all hooks over specified time period."""
        if not self.db_path.exists():
            return {"error": "No performance data available"}
        
        cutoff_time = datetime.now() - timedelta(hours=hours)
        
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                # Get average execution times by hook
                cursor.execute("""
                    SELECT hook_name, 
                           AVG(execution_time) as avg_time,
                           COUNT(*) as executions,
                           MIN(execution_time) as min_time,
                           MAX(execution_time) as max_time,
                           AVG(cache_hits) as avg_cache_hits,
                           AVG(cache_misses) as avg_cache_misses
                    FROM performance_metrics 
                    WHERE timestamp >= ?
                    GROUP BY hook_name
                    ORDER BY avg_time DESC
                """, (cutoff_time.isoformat(),))
                
                hooks_performance = []
                for row in cursor.fetchall():
                    hook_name, avg_time, executions, min_time, max_time, avg_cache_hits, avg_cache_misses = row
                    
                    # Calculate cache hit rate
                    total_requests = avg_cache_hits + avg_cache_misses
                    cache_hit_rate = (avg_cache_hits / total_requests * 100) if total_requests > 0 else 0
                    
                    # Performance status
                    status = "excellent" if avg_time < 0.05 else "good" if avg_time < 0.1 else "needs_attention"
                    
                    hooks_performance.append({
                        "hook_name": hook_name,
                        "average_execution_time": round(avg_time, 4),
                        "executions": executions,
                        "min_time": round(min_time, 4),
                        "max_time": round(max_time, 4),
                        "cache_hit_rate_percent": round(cache_hit_rate, 1),
                        "status": status
                    })
                
                return {
                    "time_period_hours": hours,
                    "total_hooks": len(hooks_performance),
                    "hooks_performance": hooks_performance,
                    "cache_stats": get_cache_stats()
                }
        
        except Exception as e:
            return {"error": f"Database query failed: {e}"}
    
    def get_performance_alerts(self, hours: int = 1) -> List[Dict]:
        """Get performance alerts for hooks exceeding thresholds."""
        if not self.db_path.exists():
            return []
        
        cutoff_time = datetime.now() - timedelta(hours=hours)
        alerts = []
        
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                # Find hooks exceeding 100ms threshold
                cursor.execute("""
                    SELECT hook_name, execution_time, timestamp
                    FROM performance_metrics 
                    WHERE timestamp >= ? AND execution_time > 0.1
                    ORDER BY execution_time DESC
                    LIMIT 10
                """, (cutoff_time.isoformat(),))
                
                for row in cursor.fetchall():
                    hook_name, execution_time, timestamp = row
                    alerts.append({
                        "type": "slow_execution",
                        "hook_name": hook_name,
                        "execution_time": round(execution_time, 4),
                        "threshold": 0.1,
                        "timestamp": timestamp,
                        "message": f"Hook {hook_name} exceeded 100ms threshold: {execution_time:.3f}s"
                    })
                
                # Find hooks with consistently high execution times
                cursor.execute("""
                    SELECT hook_name, AVG(execution_time) as avg_time
                    FROM performance_metrics 
                    WHERE timestamp >= ?
                    GROUP BY hook_name
                    HAVING AVG(execution_time) > 0.05
                    ORDER BY avg_time DESC
                """, (cutoff_time.isoformat(),))
                
                for row in cursor.fetchall():
                    hook_name, avg_time = row
                    alerts.append({
                        "type": "consistently_slow",
                        "hook_name": hook_name,
                        "average_execution_time": round(avg_time, 4),
                        "threshold": 0.05,
                        "message": f"Hook {hook_name} consistently slow: {avg_time:.3f}s average"
                    })
        
        except Exception as e:
            alerts.append({
                "type": "monitoring_error",
                "message": f"Performance monitoring error: {e}"
            })
        
        return alerts
    
    def get_optimization_recommendations(self) -> List[Dict]:
        """Get optimization recommendations based on performance data."""
        recommendations = []
        
        try:
            summary = self.get_hook_performance_summary(hours=24)
            if "hooks_performance" not in summary:
                return recommendations
            
            for hook in summary["hooks_performance"]:
                hook_name = hook["hook_name"]
                avg_time = hook["average_execution_time"]
                cache_hit_rate = hook["cache_hit_rate_percent"]
                executions = hook["executions"]
                
                # High execution time recommendations
                if avg_time > 0.1:
                    recommendations.append({
                        "type": "performance",
                        "hook_name": hook_name,
                        "priority": "high",
                        "issue": f"Average execution time {avg_time:.3f}s exceeds 100ms target",
                        "recommendation": "Consider pattern pre-compilation, caching optimization, or algorithmic improvements"
                    })
                
                # Low cache hit rate recommendations
                if cache_hit_rate < 70 and executions > 10:
                    recommendations.append({
                        "type": "caching",
                        "hook_name": hook_name,
                        "priority": "medium",
                        "issue": f"Cache hit rate {cache_hit_rate:.1f}% is below 70% target",
                        "recommendation": "Review caching strategy, increase TTL, or optimize cache key generation"
                    })
                
                # High execution count with good performance
                if executions > 100 and avg_time < 0.05:
                    recommendations.append({
                        "type": "optimization_success",
                        "hook_name": hook_name,
                        "priority": "info",
                        "issue": f"High usage ({executions} executions) with excellent performance",
                        "recommendation": "Consider this hook as optimization success model for other hooks"
                    })
            
        except Exception as e:
            recommendations.append({
                "type": "error",
                "priority": "high",
                "issue": f"Failed to generate recommendations: {e}",
                "recommendation": "Check performance monitoring system"
            })
        
        return recommendations
    
    def export_performance_report(self, hours: int = 24) -> str:
        """Export comprehensive performance report as formatted text."""
        summary = self.get_hook_performance_summary(hours)
        alerts = self.get_performance_alerts(hours)
        recommendations = self.get_optimization_recommendations()
        
        report = []
        report.append("=" * 80)
        report.append("SECURITY HOOKS PERFORMANCE REPORT")
        report.append("=" * 80)
        report.append(f"Report Period: {hours} hours")
        report.append(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        report.append("")
        
        # Performance Summary
        if "hooks_performance" in summary:
            report.append("PERFORMANCE SUMMARY")
            report.append("-" * 40)
            for hook in summary["hooks_performance"]:
                status_icon = "✓" if hook["status"] == "excellent" else "⚠" if hook["status"] == "good" else "❌"
                report.append(f"{status_icon} {hook['hook_name']:<30} {hook['average_execution_time']:>8.3f}s (Cache: {hook['cache_hit_rate_percent']:>5.1f}%)")
            report.append("")
        
        # Cache Performance
        cache_stats = summary.get("cache_stats", {})
        if cache_stats:
            report.append("CACHE PERFORMANCE")
            report.append("-" * 40)
            if "result_cache" in cache_stats:
                result_cache = cache_stats["result_cache"]
                report.append(f"Result Cache Hit Rate: {result_cache.get('hit_rate_percent', 0):.1f}%")
                report.append(f"Result Cache Size: {result_cache.get('size', 0)} entries")
            report.append(f"Compiled Patterns: {cache_stats.get('pattern_count', 0)}")
            report.append("")
        
        # Performance Alerts
        if alerts:
            report.append("PERFORMANCE ALERTS")
            report.append("-" * 40)
            for alert in alerts:
                report.append(f"⚠ {alert['message']}")
            report.append("")
        
        # Optimization Recommendations
        if recommendations:
            report.append("OPTIMIZATION RECOMMENDATIONS")
            report.append("-" * 40)
            for rec in recommendations:
                priority_icon = "🔴" if rec["priority"] == "high" else "🟡" if rec["priority"] == "medium" else "ℹ"
                report.append(f"{priority_icon} {rec['hook_name']}: {rec['recommendation']}")
            report.append("")
        
        report.append("=" * 80)
        return "\n".join(report)


def main():
    """Command-line interface for performance monitoring."""
    import argparse
    
    parser = argparse.ArgumentParser(description="Security hooks performance monitoring")
    parser.add_argument("--hours", type=int, default=24, help="Time period in hours (default: 24)")
    parser.add_argument("--format", choices=["json", "text"], default="text", help="Output format")
    parser.add_argument("--alerts-only", action="store_true", help="Show only performance alerts")
    
    args = parser.parse_args()
    
    dashboard = PerformanceDashboard()
    
    if args.alerts_only:
        alerts = dashboard.get_performance_alerts(args.hours)
        if args.format == "json":
            print(json.dumps(alerts, indent=2))
        else:
            if alerts:
                print("PERFORMANCE ALERTS:")
                for alert in alerts:
                    print(f"⚠ {alert['message']}")
            else:
                print("No performance alerts found.")
    else:
        if args.format == "json":
            summary = dashboard.get_hook_performance_summary(args.hours)
            print(json.dumps(summary, indent=2))
        else:
            report = dashboard.export_performance_report(args.hours)
            print(report)


if __name__ == "__main__":
    main()