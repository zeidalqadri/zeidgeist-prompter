#!/usr/bin/env python3
"""
Check ignore patterns and prevent access to sensitive files.
This script is called before tool use to ensure sensitive files are not accessed.
Optimized for high performance with intelligent caching.
"""

import json
import sys
import os
import fnmatch
from utils.trace_decision import log_decision
from utils.performance_cache import (
    performance_decorator, cache_result, get_cached_result
)


@performance_decorator("check_ignore_patterns")
def main():
    """Main function to check ignore patterns with caching optimization."""
    try:
        # Read input from stdin
        data = json.load(sys.stdin)
        tool_input = data.get('tool_input', {})
        path = tool_input.get('file_path', '')
        command = tool_input.get('command', '')
        
        # Check cache first for performance
        cache_key = f"ignore_check:{hash(path)}:{hash(command)}"
        cached_result = get_cached_result(cache_key)
        if cached_result is not None:
            if cached_result['should_block']:
                print(json.dumps(cached_result['output']))
                sys.exit(2)
            else:
                sys.exit(0)
        
        # Define ignore patterns (pre-compiled for performance)
        ignore_patterns = [
            '.env', '.git/', 'dist/', 'build/', 'venv', '.env.'
        ]
        
        # Check claudeignore file
        claudeignore_path = '.claude/.ignore'
        
        # Check .env file for environment variables in commands
        env_path = '.env'
        
        # Check if path contains any ignore patterns (optimized)
        for pattern in ignore_patterns:
            if pattern in path:
                output = {
                    "continue": False,
                    "stopReason": f"Security policy violation. Attempted to access sensitive file. (file: {path}, pattern: {pattern})",
                    "suppressOutput": False,
                    "hookSpecificOutput": {
                        "hookEventName": "PreToolUse",
                        "permissionDecision": "deny",
                        "permissionDecisionReason": f"Security policy violation. Attempted to access sensitive file. (file: {path}, pattern: {pattern}). See '.claude/.ignore' for more information."
                    }
                }
                # Cache the blocking result
                cache_result(cache_key, {'should_block': True, 'output': output}, ttl_override=300)
                log_decision(output, operation_type="ignore_patterns_decision")
                print(json.dumps(output))
                sys.exit(2)
        
        # Check claudeignore file if it exists
        if os.path.exists(claudeignore_path):
            with open(claudeignore_path, 'r') as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith('#'):
                        if fnmatch.fnmatch(path, line):
                            output = {
                                "continue": False,
                                "stopReason": f"Security policy violation. Attempted to access sensitive file. (file: {path}, pattern: {line})",
                                "suppressOutput": False,
                                "hookSpecificOutput": {
                                    "hookEventName": "PreToolUse",
                                    "permissionDecision": "deny",
                                    "permissionDecisionReason": f"Security policy violation. Attempted to access sensitive file. (file: {path}, pattern: {line}). See '.claude/.ignore' for more information."
                                }
                            }
                            # Cache the blocking result
                            cache_result(cache_key, {'should_block': True, 'output': output}, ttl_override=300)
                            log_decision(output, operation_type="claudeignore_decision")
                            print(json.dumps(output))
                            sys.exit(2)
        
        # # Check if command contains environment variables from .env
        # if os.path.exists(env_path):
        #     with open(env_path, 'r') as f:
        #         for line in f:
        #             if '=' in line and line.strip() and not line.startswith('#'):
        #                 env_var = line.split('=')[0].strip()
        #                 if env_var in command:
        #                     output = {
        #                         "continue": False,
        #                         "stopReason": f"Security policy violation. Attempted to access sensitive file. (file: {path}, env_var: {env_var})",
        #                         "suppressOutput": False,
        #                         "decision": "block",
        #                         "reason": f"Security policy violation. Attempted to access sensitive file. (file: {path}, env_var: {env_var})"
        #                     }
        #                     print(json.dumps(output))
        #                     sys.exit(2)
        
        # All checks passed - cache the success result
        cache_result(cache_key, {'should_block': False}, ttl_override=300)
        sys.exit(0)
        
    except Exception as e:
        # Log error but don't block the operation
        print(f"Error in check-ignore-patterns: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main() 