#!/usr/bin/env python3
"""
Performance testing and validation suite for optimized security hooks.
Ensures optimizations maintain 100% security effectiveness while improving performance.
"""

import json
import time
import subprocess
import sys
import tempfile
import os
from pathlib import Path
from typing import Dict, List, Tuple, Any
from datetime import datetime
import statistics


class SecurityHookTester:
    """Comprehensive testing suite for security hook performance and effectiveness."""
    
    def __init__(self):
        self.hooks_dir = Path('.claude/hooks')
        self.test_results = []
        
    def run_performance_tests(self) -> Dict:
        """Run comprehensive performance tests on all security hooks."""
        print("🔧 Running Security Hook Performance Tests...")
        print("=" * 60)
        
        results = {
            "test_start_time": datetime.now().isoformat(),
            "hooks_tested": [],
            "performance_summary": {},
            "security_validation": {},
            "optimization_effectiveness": {}
        }
        
        # Test each critical security hook
        hooks_to_test = [
            ("no-secrets-prompted.py", self._test_secret_detection_hook),
            ("prevent-unsafe-commands.py", self._test_unsafe_command_hook),
            ("prevent-learning-secrets.py", self._test_learning_secrets_hook),
            ("check-ignore-patterns.py", self._test_ignore_patterns_hook),
            ("check-immutable-patterns.py", self._test_immutable_patterns_hook)
        ]
        
        for hook_name, test_function in hooks_to_test:
            print(f"\n📊 Testing {hook_name}...")
            hook_path = self.hooks_dir / hook_name
            
            if hook_path.exists():
                test_result = test_function(hook_path)
                test_result["hook_name"] = hook_name
                results["hooks_tested"].append(test_result)
                print(f"✅ {hook_name}: {test_result['status']}")
            else:
                print(f"❌ {hook_name}: Hook file not found")
        
        # Calculate overall performance summary
        results["performance_summary"] = self._calculate_performance_summary(results["hooks_tested"])
        
        # Security validation summary
        results["security_validation"] = self._validate_security_effectiveness(results["hooks_tested"])
        
        # Optimization effectiveness
        results["optimization_effectiveness"] = self._calculate_optimization_effectiveness(results["hooks_tested"])
        
        results["test_end_time"] = datetime.now().isoformat()
        
        return results
    
    def _test_secret_detection_hook(self, hook_path: Path) -> Dict:
        """Test the no-secrets-prompted.py hook for performance and effectiveness."""
        test_cases = [
            # Positive cases (should be blocked)
            {"prompt": "sk-1234567890abcdef1234567890abcdef", "should_block": True, "case": "OpenAI API key"},
            {"prompt": "ghp_1234567890abcdef1234567890abcdef123456", "should_block": True, "case": "GitHub token"},
            {"prompt": "Here's my API key: 'AKIA1234567890ABCDEF'", "should_block": True, "case": "AWS key quoted"},
            {"prompt": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U", "should_block": True, "case": "JWT token"},
            
            # Negative cases (should pass)
            {"prompt": "Hello world", "should_block": False, "case": "Normal text"},
            {"prompt": "The secret to success is hard work", "should_block": False, "case": "Natural language with 'secret'"},
            {"prompt": "git commit -m 'fix: update api key validation'", "should_block": False, "case": "Normal git command"},
            {"prompt": "Let's discuss the architecture", "should_block": False, "case": "Regular conversation"}
        ]
        
        return self._run_hook_tests(hook_path, test_cases, input_key="prompt")
    
    def _test_unsafe_command_hook(self, hook_path: Path) -> Dict:
        """Test the prevent-unsafe-commands.py hook."""
        test_cases = [
            # Positive cases (should be blocked/require approval)
            {"tool_name": "Bash", "tool_input": {"command": "rm -rf /"}, "should_block": True, "case": "Dangerous rm command"},
            {"tool_name": "Bash", "tool_input": {"command": "git reset --hard HEAD~5"}, "should_block": True, "case": "Git reset"},
            {"tool_name": "Bash", "tool_input": {"command": "chmod 777 /etc/passwd"}, "should_block": True, "case": "Dangerous chmod"},
            {"tool_name": "Bash", "tool_input": {"command": "dd if=/dev/zero of=/dev/sda"}, "should_block": True, "case": "Dangerous dd"},
            
            # Negative cases (should pass)
            {"tool_name": "Bash", "tool_input": {"command": "ls -la"}, "should_block": False, "case": "Safe ls command"},
            {"tool_name": "Bash", "tool_input": {"command": "git status"}, "should_block": False, "case": "Safe git status"},
            {"tool_name": "Bash", "tool_input": {"command": "npm install"}, "should_block": False, "case": "Safe npm install"},
            {"tool_name": "Read", "tool_input": {"file_path": "test.txt"}, "should_block": False, "case": "Non-bash tool"}
        ]
        
        return self._run_hook_tests(hook_path, test_cases, input_format="tool_use")
    
    def _test_learning_secrets_hook(self, hook_path: Path) -> Dict:
        """Test the prevent-learning-secrets.py hook."""
        # Create temporary test directory structure
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            
            # Create test files
            (temp_path / ".env").write_text("API_KEY=secret123\nDB_PASSWORD=verysecret")
            (temp_path / "safe_file.txt").write_text("This is safe content")
            (temp_path / "config.py").write_text("DATABASE_URL = 'postgresql://user:pass@localhost/db'")
            
            # Test cases for project safety checking
            test_start_time = time.time()
            
            try:
                # Run the hook in standalone mode
                result = subprocess.run(
                    [sys.executable, str(hook_path), str(temp_path), "--json"],
                    capture_output=True,
                    text=True,
                    timeout=10
                )
                
                execution_time = time.time() - test_start_time
                
                # Should detect unsafe project
                if result.returncode != 0:  # Unsafe project detected
                    return {
                        "status": "PASS",
                        "execution_time": execution_time,
                        "security_effective": True,
                        "performance_acceptable": execution_time < 2.0,  # Should complete within 2 seconds
                        "details": "Correctly identified unsafe project with secrets"
                    }
                else:
                    return {
                        "status": "FAIL",
                        "execution_time": execution_time,
                        "security_effective": False,
                        "performance_acceptable": execution_time < 2.0,
                        "details": "Failed to detect secrets in project"
                    }
                    
            except subprocess.TimeoutExpired:
                return {
                    "status": "TIMEOUT",
                    "execution_time": 10.0,
                    "security_effective": False,
                    "performance_acceptable": False,
                    "details": "Hook execution timed out"
                }
            except Exception as e:
                return {
                    "status": "ERROR",
                    "execution_time": 0,
                    "security_effective": False,
                    "performance_acceptable": False,
                    "details": f"Hook execution failed: {e}"
                }
    
    def _test_ignore_patterns_hook(self, hook_path: Path) -> Dict:
        """Test the check-ignore-patterns.py hook."""
        test_cases = [
            # Should be blocked
            {"tool_input": {"file_path": ".env"}, "should_block": True, "case": ".env file"},
            {"tool_input": {"file_path": "config/.env.production"}, "should_block": True, "case": ".env variant"},
            {"tool_input": {"file_path": ".git/config"}, "should_block": True, "case": "Git config"},
            {"tool_input": {"file_path": "build/output.js"}, "should_block": True, "case": "Build directory"},
            
            # Should pass
            {"tool_input": {"file_path": "src/main.js"}, "should_block": False, "case": "Source file"},
            {"tool_input": {"file_path": "README.md"}, "should_block": False, "case": "Documentation"},
            {"tool_input": {"file_path": "package.json"}, "should_block": False, "case": "Package config"}
        ]
        
        return self._run_hook_tests(hook_path, test_cases, input_format="tool_input")
    
    def _test_immutable_patterns_hook(self, hook_path: Path) -> Dict:
        """Test the check-immutable-patterns.py hook."""
        test_cases = [
            # Should be blocked/require approval
            {"tool_input": {"file_path": ".claude/rules.md"}, "should_block": True, "case": "Claude rules"},
            {"tool_input": {"file_path": "package-lock.json"}, "should_block": True, "case": "Package lock"},
            {"tool_input": {"file_path": ".claude/settings.json"}, "should_block": True, "case": "Claude settings"},
            
            # Should pass
            {"tool_input": {"file_path": "src/components/Button.jsx"}, "should_block": False, "case": "Source component"},
            {"tool_input": {"file_path": "docs/api.md"}, "should_block": False, "case": "Documentation"}
        ]
        
        return self._run_hook_tests(hook_path, test_cases, input_format="tool_input")
    
    def _run_hook_tests(self, hook_path: Path, test_cases: List[Dict], input_format: str = "prompt", input_key: str = None) -> Dict:
        """Run a series of test cases against a hook and measure performance."""
        execution_times = []
        security_results = []
        
        for test_case in test_cases:
            # Prepare input based on format
            if input_format == "prompt":
                hook_input = {"prompt": test_case[input_key or "prompt"]}
            elif input_format == "tool_use":
                hook_input = test_case
            elif input_format == "tool_input":
                hook_input = test_case
            else:
                hook_input = test_case
            
            # Run the hook
            start_time = time.time()
            
            try:
                result = subprocess.run(
                    [sys.executable, str(hook_path)],
                    input=json.dumps(hook_input),
                    capture_output=True,
                    text=True,
                    timeout=5
                )
                
                execution_time = time.time() - start_time
                execution_times.append(execution_time)
                
                # Check security effectiveness
                expected_block = test_case.get("should_block", False)
                actually_blocked = result.returncode != 0
                
                security_effective = (expected_block == actually_blocked)
                security_results.append(security_effective)
                
                if not security_effective:
                    print(f"  ❌ Security test failed for {test_case['case']}: expected_block={expected_block}, actually_blocked={actually_blocked}")
                else:
                    print(f"  ✅ {test_case['case']}: {execution_time:.3f}s")
                
            except subprocess.TimeoutExpired:
                execution_times.append(5.0)  # Timeout duration
                security_results.append(False)  # Failed security test
                print(f"  ⏱ Timeout for {test_case['case']}")
            except Exception as e:
                execution_times.append(0)
                security_results.append(False)
                print(f"  ❌ Error for {test_case['case']}: {e}")
        
        # Calculate metrics
        avg_execution_time = statistics.mean(execution_times) if execution_times else 0
        max_execution_time = max(execution_times) if execution_times else 0
        security_effectiveness = (sum(security_results) / len(security_results) * 100) if security_results else 0
        
        # Determine overall status
        if security_effectiveness == 100 and avg_execution_time < 0.1:
            status = "EXCELLENT"
        elif security_effectiveness == 100 and avg_execution_time < 0.2:
            status = "GOOD"
        elif security_effectiveness == 100:
            status = "SECURITY_EFFECTIVE"
        else:
            status = "NEEDS_ATTENTION"
        
        return {
            "status": status,
            "execution_time_avg": avg_execution_time,
            "execution_time_max": max_execution_time,
            "security_effectiveness_percent": security_effectiveness,
            "test_cases_run": len(test_cases),
            "security_effective": security_effectiveness == 100,
            "performance_acceptable": avg_execution_time < 0.1
        }
    
    def _calculate_performance_summary(self, hook_results: List[Dict]) -> Dict:
        """Calculate overall performance summary."""
        if not hook_results:
            return {}
        
        avg_times = [r["execution_time_avg"] for r in hook_results if "execution_time_avg" in r]
        max_times = [r["execution_time_max"] for r in hook_results if "execution_time_max" in r]
        
        return {
            "overall_avg_execution_time": statistics.mean(avg_times) if avg_times else 0,
            "slowest_hook_time": max(max_times) if max_times else 0,
            "hooks_under_100ms": sum(1 for t in avg_times if t < 0.1),
            "total_hooks_tested": len(hook_results),
            "performance_target_met": all(t < 0.1 for t in avg_times) if avg_times else False
        }
    
    def _validate_security_effectiveness(self, hook_results: List[Dict]) -> Dict:
        """Validate that security effectiveness is maintained."""
        if not hook_results:
            return {}
        
        security_rates = [r["security_effectiveness_percent"] for r in hook_results if "security_effectiveness_percent" in r]
        
        return {
            "overall_security_effectiveness": statistics.mean(security_rates) if security_rates else 0,
            "hooks_100_percent_effective": sum(1 for r in security_rates if r == 100),
            "security_target_met": all(r == 100 for r in security_rates) if security_rates else False,
            "critical_security_maintained": all(r >= 100 for r in security_rates) if security_rates else False
        }
    
    def _calculate_optimization_effectiveness(self, hook_results: List[Dict]) -> Dict:
        """Calculate the effectiveness of optimizations."""
        performance_good = sum(1 for r in hook_results if r.get("performance_acceptable", False))
        security_maintained = sum(1 for r in hook_results if r.get("security_effective", False))
        total_hooks = len(hook_results)
        
        return {
            "performance_improvement_rate": (performance_good / total_hooks * 100) if total_hooks > 0 else 0,
            "security_maintenance_rate": (security_maintained / total_hooks * 100) if total_hooks > 0 else 0,
            "overall_optimization_success": (performance_good == total_hooks and security_maintained == total_hooks),
            "hooks_optimized_successfully": performance_good,
            "hooks_security_maintained": security_maintained
        }
    
    def generate_test_report(self, results: Dict) -> str:
        """Generate a comprehensive test report."""
        report = []
        report.append("=" * 80)
        report.append("SECURITY HOOK PERFORMANCE TEST REPORT")
        report.append("=" * 80)
        report.append(f"Test Start: {results['test_start_time']}")
        report.append(f"Test End: {results['test_end_time']}")
        report.append("")
        
        # Performance Summary
        perf_summary = results.get("performance_summary", {})
        report.append("PERFORMANCE SUMMARY")
        report.append("-" * 40)
        report.append(f"Overall Average Execution Time: {perf_summary.get('overall_avg_execution_time', 0):.4f}s")
        report.append(f"Hooks Under 100ms Target: {perf_summary.get('hooks_under_100ms', 0)}/{perf_summary.get('total_hooks_tested', 0)}")
        report.append(f"Performance Target Met: {'✅ YES' if perf_summary.get('performance_target_met', False) else '❌ NO'}")
        report.append("")
        
        # Security Validation
        security = results.get("security_validation", {})
        report.append("SECURITY EFFECTIVENESS")
        report.append("-" * 40)
        report.append(f"Overall Security Effectiveness: {security.get('overall_security_effectiveness', 0):.1f}%")
        report.append(f"Hooks 100% Effective: {security.get('hooks_100_percent_effective', 0)}/{perf_summary.get('total_hooks_tested', 0)}")
        report.append(f"Security Target Met: {'✅ YES' if security.get('security_target_met', False) else '❌ NO'}")
        report.append("")
        
        # Optimization Effectiveness
        optimization = results.get("optimization_effectiveness", {})
        report.append("OPTIMIZATION RESULTS")
        report.append("-" * 40)
        report.append(f"Performance Improvement Rate: {optimization.get('performance_improvement_rate', 0):.1f}%")
        report.append(f"Security Maintenance Rate: {optimization.get('security_maintenance_rate', 0):.1f}%")
        report.append(f"Overall Success: {'✅ YES' if optimization.get('overall_optimization_success', False) else '❌ NO'}")
        report.append("")
        
        # Individual Hook Results
        report.append("INDIVIDUAL HOOK RESULTS")
        report.append("-" * 40)
        for hook_result in results.get("hooks_tested", []):
            hook_name = hook_result.get("hook_name", "Unknown")
            status = hook_result.get("status", "Unknown")
            avg_time = hook_result.get("execution_time_avg", 0)
            security = hook_result.get("security_effectiveness_percent", 0)
            
            status_icon = "✅" if status in ["EXCELLENT", "GOOD"] else "⚠" if status == "SECURITY_EFFECTIVE" else "❌"
            report.append(f"{status_icon} {hook_name:<35} {avg_time:>8.3f}s  Security: {security:>5.1f}%")
        
        report.append("")
        report.append("=" * 80)
        
        return "\n".join(report)


def main():
    """Main function for running performance tests."""
    import argparse
    
    parser = argparse.ArgumentParser(description="Security hooks performance testing")
    parser.add_argument("--format", choices=["json", "text"], default="text", help="Output format")
    parser.add_argument("--save-results", help="Save results to file")
    
    args = parser.parse_args()
    
    tester = SecurityHookTester()
    results = tester.run_performance_tests()
    
    if args.format == "json":
        output = json.dumps(results, indent=2)
    else:
        output = tester.generate_test_report(results)
    
    print(output)
    
    if args.save_results:
        with open(args.save_results, 'w') as f:
            f.write(output)
        print(f"\n📁 Results saved to {args.save_results}")
    
    # Exit with appropriate code
    optimization_success = results.get("optimization_effectiveness", {}).get("overall_optimization_success", False)
    sys.exit(0 if optimization_success else 1)


if __name__ == "__main__":
    main()