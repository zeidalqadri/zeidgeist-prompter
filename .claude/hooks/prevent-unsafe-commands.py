#!/usr/bin/env python3
import json
import re
import sys
from utils.trace_decision import log_decision
from utils.performance_cache import (
    performance_decorator, get_preferences, compile_pattern_group,
    match_pattern_group, cache_result, get_cached_result
)

# Pre-compile all unsafe command patterns for maximum performance
_UNSAFE_COMMAND_PATTERNS_COMPILED = False

def _compile_unsafe_command_patterns():
    """Pre-compile all unsafe command patterns once at module load."""
    global _UNSAFE_COMMAND_PATTERNS_COMPILED
    if _UNSAFE_COMMAND_PATTERNS_COMPILED:
        return
    
    # Group patterns by danger level for optimized checking
    # High-danger patterns (checked first)
    high_danger_patterns = [
        # File deletion commands - CRITICAL
        (r"(^|\s&\s)unlink\b", "unlink_file_deletion"),
        (r"(^|\s&\s)shred\b", "shred_permanent_deletion"),
        (r"(^|\s&\s)dd\b", "dd_disk_overwrite"),
        (r"(^|\s&\s)format\b", "format_destructive"),
        (r"(^|\s&\s)fdisk\b", "fdisk_partition_modify"),
        (r"(^|\s&\s)parted\b", "parted_partition_modify"),
        (r"(^|\s&\s)mkfs\b", "mkfs_filesystem_create"),
        # Git destructive operations - HIGH PRIORITY
        (r"(^|\s&\s)git\s+reset\b", "git_reset_data_loss"),
        (r"(^|\s&\s)git\s+branch\s+[-\w]*\s*-[dD]\b", "git_branch_delete"),
        (r"(^|\s&\s)git\s+rebase\b", "git_rebase_history"),
        (r"(^|\s&\s)git\s+push\s+[-\w]*\s*--force\b", "git_force_push"),
        (r"(^|\s&\s)git\s+push\s+[-\w]*\s*-f\b", "git_force_push_short"),
        (r"(^|\s&\s)git\s+clean\b", "git_clean_files"),
        (r"(^|\s&\s)git\s+gc\s+[-\w]*\s*--prune\b", "git_gc_prune"),
        # System destructive and permission commands
        (r"(^|\s&\s)chmod\b", "chmod_permissions"),
        # Process management - HIGH PRIORITY
        (r"(^|\s&\s)kill\s+[-\w]*\s*-9\b", "kill_force_terminate"),
        (r"(^|\s&\s)killall\b", "killall_multiple_processes"),
        (r"(^|\s&\s)pkill\b", "pkill_process_name"),
        # Network and service commands
        (r"(^|\s&\s)service\s+[-\w]*\s*stop\b", "service_stop"),
        (r"(^|\s&\s)systemctl\s+[-\w]*\s*stop\b", "systemctl_stop"),
        (r"(^|\s&\s)systemctl\s+[-\w]*\s*disable\b", "systemctl_disable"),
    ]
    
    # Medium-danger patterns (package management)
    medium_danger_patterns = [
        (r"(^|\s&\s)apt\s+[-\w]*\s*remove\b", "apt_remove_packages"),
        (r"(^|\s&\s)apt\s+[-\w]*\s*purge\b", "apt_purge_packages"),
        (r"(^|\s&\s)yum\s+[-\w]*\s*remove\b", "yum_remove_packages"),
        (r"(^|\s&\s)brew\s+[-\w]*\s*uninstall\b", "brew_uninstall_packages"),
        # Database operations - CRITICAL
        (r"(^|\s&\s)drop\s+database\b", "drop_database"),
        (r"(^|\s&\s)drop\s+table\b", "drop_table"),
        (r"(^|\s&\s)truncate\s+table\b", "truncate_table"),
        (r"(^|\s&\s)delete\s+from\b", "delete_from_table"),
        (r"(^|\s&\s)drop\s+policy\b", "drop_policy"),
        (r"(^|\s&\s)drop\s+role\b", "drop_role"),
        (r"(^|\s&\s)drop\s+user\b", "drop_user"),
        (r"(^|\s&\s)drop\s+index\b", "drop_index"),
        (r"(^|\s&\s)drop\s+view\b", "drop_view"),
        (r"(^|\s&\s)drop\s+function\b", "drop_function"),
        (r"(^|\s&\s)drop\s+procedure\b", "drop_procedure"),
        (r"(^|\s&\s)drop\s+trigger\b", "drop_trigger"),
        (r"(^|\s&\s)drop\s+constraint\b", "drop_constraint"),
        (r"(^|\s&\s)drop\s+sequence\b", "drop_sequence"),
        (r"(^|\s&\s)drop\s+type\b", "drop_type"),
        (r"(^|\s&\s)drop\s+schema\b", "drop_schema"),
        (r"(^|\s&\s)drop\s+extension\b", "drop_extension"),
        
        # Execution commands
        (r"(^|\s&\s)exec\b", "exec_command"),
        (r"(^|\s&\s)execute\b", "execute_command"),
        (r"(^|\s&\s)source\b", "source_command"),
        (r"(^|\s&\s)eval\b", "eval_command"),
    ]
    
    # Low-danger patterns (information exposure - checked last)
    low_danger_patterns = [
        # .env file reading patterns (consolidated)
        (r"(^|\s&\s)(cat|less|more|head|tail|strings|hexdump|xxd)\s+[-\w]*\s*\.env\b", "env_file_read"),
        (r"(^|\s&\s)(cat|less|more|head|tail|strings|hexdump|xxd)\s+[-\w]*\s*\.env\.", "env_file_read_variant"),
        # SSH key and credential exposure
        (r"(^|\s&\s)cat\s+[-\w]*\s*\.ssh/\b", "ssh_key_read"),
        (r"(^|\s&\s)cat\s+[-\w]*\s*id_rsa\b", "private_ssh_key_read"),
        (r"(^|\s&\s)cat\s+[-\w]*\s*id_ed25519\b", "ed25519_key_read"),
        (r"(^|\s&\s)cat\s+[-\w]*\s*\.pem\b", "pem_file_read"),
        (r"(^|\s&\s)cat\s+[-\w]*\s*\.key\b", "key_file_read"),
        # Configuration files
        (r"(^|\s&\s)cat\s+[-\w]*\s*config\.", "config_file_read"),
        (r"(^|\s&\s)cat\s+[-\w]*\s*\.config\b", "config_file_read_hidden"),
        # Network information exposure
        (r"(^|\s&\s)netstat\s+[-\w]*\s*-a\b", "netstat_all_connections"),
        (r"(^|\s&\s)ss\s+[-\w]*\s*-a\b", "ss_all_connections"),
        (r"(^|\s&\s)ifconfig\b", "ifconfig_network_info"),
        # Process information exposure
        (r"(^|\s&\s)ps\s+[-\w]*\s*-ef\b", "ps_detailed_process_info"),
        (r"(^|\s&\s)ps\s+[-\w]*\s*-e\b", "ps_all_processes"),
        # File system operations
        (r"(^|\s&\s)ln\s+[-\w]*\s*-s\s*/\b", "symlink_root_directory"),
        # User and permission management
        (r"(^|\s&\s)userdel\b", "user_delete"),
        (r"(^|\s&\s)groupdel\b", "group_delete"),
        (r"(^|\s&\s)passwd\b", "password_change"),
        # Cron and scheduled tasks
        (r"(^|\s&\s)crontab\s+[-\w]*\s*-r\b", "crontab_remove_all"),
        (r"(^|\s&\s)crontab\s+[-\w]*\s*-l\b", "crontab_list_jobs")
    ]
    
    # Compile pattern groups for optimized matching
    compile_pattern_group('high_danger_commands', high_danger_patterns)
    compile_pattern_group('medium_danger_commands', medium_danger_patterns)
    compile_pattern_group('low_danger_commands', low_danger_patterns)
    
    _UNSAFE_COMMAND_PATTERNS_COMPILED = True

# Error message mapping for pattern types
ERROR_MESSAGES = {
    # High-danger patterns
    'unlink_file_deletion': "unlink can delete files. Use 'git rm' for tracked files or request a human to run this command, clearly highlighting risks.",
    'shred_permanent_deletion': "shred permanently destroys files. This operation is irreversible. Request a human to run this command, clearly highlighting risks.",
    'dd_disk_overwrite': "dd can overwrite disk data. This is extremely destructive. Request a human to run this command, clearly highlighting risks.",
    'format_destructive': "format command can destroy data. Request a human to run this command, clearly highlighting risks.",
    'fdisk_partition_modify': "fdisk can modify disk partitions. This is destructive. Request a human to run this command, clearly highlighting risks.",
    'parted_partition_modify': "parted can modify disk partitions. This is destructive. Request a human to run this command, clearly highlighting risks.",
    'mkfs_filesystem_create': "mkfs creates new filesystems and destroys existing data. Request a human to run this command, clearly highlighting risks.",
    'chmod_permissions': "chmod changes permissions. This is a security risk. Request a human to run this command, clearly highlighting risks.",
    'git_reset_data_loss': "git reset can cause data loss. Request a human to run this command, clearly highlighting risks.",
    'git_branch_delete': "git branch -d/-D can delete branches. Request a human to run this command, clearly highlighting risks.",
    'git_rebase_history': "git rebase rewrites history. Request a human to run this command, clearly highlighting risks.",
    'git_force_push': "git push --force can overwrite remote history. Request a human to run this command, clearly highlighting risks.",
    'git_force_push_short': "git push -f can overwrite remote history. Request a human to run this command, clearly highlighting risks.",
    'git_clean_files': "git clean can delete untracked files. Request a human to run this command, clearly highlighting risks.",
    'git_gc_prune': "git gc --prune can permanently delete unreferenced objects. Request a human to run this command, clearly highlighting risks.",
    'kill_force_terminate': "kill -9 forces process termination. Use regular kill first. Request a human to run this command, clearly highlighting risks.",
    'killall_multiple_processes': "killall can terminate multiple processes. Review which processes will be affected. Request a human to run this command, clearly highlighting risks.",
    'pkill_process_name': "pkill can terminate processes by name. Review which processes will be affected. Request a human to run this command, clearly highlighting risks.",
    'service_stop': "service stop can disrupt system services. Review which service will be stopped. Request a human to run this command, clearly highlighting risks.",
    'systemctl_stop': "systemctl stop can disrupt system services. Review which service will be stopped. Request a human to run this command, clearly highlighting risks.",
    'systemctl_disable': "systemctl disable can prevent services from starting. Request a human to run this command, clearly highlighting risks.",
    
    # Medium-danger patterns
    'apt_remove_packages': "apt remove can uninstall packages. Review what will be removed. Request a human to run this command, clearly highlighting risks.",
    'apt_purge_packages': "apt purge can completely remove packages and configs. Review first. Request a human to run this command, clearly highlighting risks.",
    'yum_remove_packages': "yum remove can uninstall packages. Review what will be removed. Request a human to run this command, clearly highlighting risks.",
    'brew_uninstall_packages': "brew uninstall can remove packages. Review what will be removed. Request a human to run this command, clearly highlighting risks.",
    
    # Database operations
    'drop_database': "drop database can permanently delete databases. Review first. Request a human to run this command, clearly highlighting risks.",
    'drop_table': "drop table can permanently delete tables. Review first. Request a human to run this command, clearly highlighting risks.",
    'truncate_table': "truncate table can permanently delete all data. Review first. Request a human to run this command, clearly highlighting risks.",
    'delete_from_table': "delete from can remove rows from tables. Review what will be deleted first. Request a human to run this command, clearly highlighting risks.",
    'drop_policy': "drop policy can remove security policies. Review which policy will be affected. Request a human to run this command, clearly highlighting risks.",
    'drop_role': "drop role can remove database roles. Review which role will be affected. Request a human to run this command, clearly highlighting risks.",
    'drop_user': "drop user can remove database users. Review which user will be affected. Request a human to run this command, clearly highlighting risks.",
    'drop_index': "drop index can remove database indexes. Review which index will be affected. Request a human to run this command, clearly highlighting risks.",
    'drop_view': "drop view can remove database views. Review which view will be affected. Request a human to run this command, clearly highlighting risks.",
    'drop_function': "drop function can remove database functions. Review which function will be affected. Request a human to run this command, clearly highlighting risks.",
    'drop_procedure': "drop procedure can remove database procedures. Review which procedure will be affected. Request a human to run this command, clearly highlighting risks.",
    'drop_trigger': "drop trigger can remove database triggers. Review which trigger will be affected. Request a human to run this command, clearly highlighting risks.",
    'drop_constraint': "drop constraint can remove database constraints. Review which constraint will be affected. Request a human to run this command, clearly highlighting risks.",
    'drop_sequence': "drop sequence can remove database sequences. Review which sequence will be affected. Request a human to run this command, clearly highlighting risks.",
    'drop_type': "drop type can remove database types. Review which type will be affected. Request a human to run this command, clearly highlighting risks.",
    'drop_schema': "drop schema can remove database schemas. Review which schema will be affected. Request a human to run this command, clearly highlighting risks.",
    'drop_extension': "drop extension can remove database extensions. Review which extension will be affected. Request a human to run this command, clearly highlighting risks.",
    'exec_command': "exec can execute files or commands. Review what will be executed. Request a human to run this command, clearly highlighting risks.",
    'execute_command': "execute can run files or commands. Review what will be executed. Request a human to run this command, clearly highlighting risks.",
    'source_command': "source can execute files. Review what will be executed. Request a human to run this command, clearly highlighting risks.",
    'eval_command': "eval can execute files. Review what will be executed. Request a human to run this command, clearly highlighting risks.",
    
    # Low-danger patterns
    'env_file_read': "Reading .env files can expose secrets. Request a human to run this command, clearly highlighting risks.",
    'env_file_read_variant': "Reading .env files can expose secrets. Request a human to run this command, clearly highlighting risks.",
    'ssh_key_read': "Reading SSH keys can expose credentials. Request a human to run this command, clearly highlighting risks.",
    'private_ssh_key_read': "Reading private SSH keys can expose credentials. Request a human to run this command, clearly highlighting risks.",
    'ed25519_key_read': "Reading private SSH keys can expose credentials. Request a human to run this command, clearly highlighting risks.",
    'pem_file_read': "Reading .pem files can expose private keys. Request a human to run this command, clearly highlighting risks.",
    'key_file_read': "Reading .key files can expose private keys. Request a human to run this command, clearly highlighting risks.",
    'config_file_read': "Reading config files can expose sensitive information. Review what you're accessing. Request a human to run this command, clearly highlighting risks.",
    'config_file_read_hidden': "Reading .config files can expose sensitive information. Review what you're accessing. Request a human to run this command, clearly highlighting risks.",
    'netstat_all_connections': "netstat -a can expose network connections. Use more specific options. Request a human to run this command, clearly highlighting risks.",
    'ss_all_connections': "ss -a can expose network connections. Use more specific options. Request a human to run this command, clearly highlighting risks.",
    'ifconfig_network_info': "ifconfig can expose network interface information. Use ip command instead. Request a human to run this command, clearly highlighting risks.",
    'ps_detailed_process_info': "ps -ef can expose command line arguments with sensitive data. Use ps aux instead. Request a human to run this command, clearly highlighting risks.",
    'ps_all_processes': "ps -e can expose command line arguments with sensitive data. Use ps aux instead. Request a human to run this command, clearly highlighting risks.",
    'symlink_root_directory': "Creating symlinks to root directory can be destructive. Review the destination. Request a human to run this command, clearly highlighting risks.",
    'user_delete': "userdel can delete user accounts. Review which user will be affected. Request a human to run this command, clearly highlighting risks.",
    'group_delete': "groupdel can delete groups. Review which group will be affected. Request a human to run this command, clearly highlighting risks.",
    'password_change': "passwd can change passwords. Review which user's password will be changed. Request a human to run this command, clearly highlighting risks.",
    'crontab_remove_all': "crontab -r can delete all cron jobs. Review what will be removed. Request a human to run this command, clearly highlighting risks.",
    'crontab_list_jobs': "crontab -l can expose scheduled tasks. Review what you're accessing. Request a human to run this command, clearly highlighting risks."
}

def validate_command(command: str) -> list[str]:
    """Optimized command validation with caching and tiered pattern matching."""
    # Check cache first
    cache_key = f"cmd_validate:{hash(command)}"
    cached_result = get_cached_result(cache_key)
    if cached_result is not None:
        return cached_result
    
    # Check for safe commands that should be allowed (quick exit)
    safe_commands = ["say ", "ls "]
    for safe_cmd in safe_commands:
        if command.startswith(safe_cmd):
            result = []  # No issues for safe commands
            cache_result(cache_key, result, ttl_override=600)  # Cache for 10 minutes
            return result
    
    # Ensure patterns are compiled
    _compile_unsafe_command_patterns()
    
    issues = []
    
    # Check high-danger patterns first (most critical)
    high_danger_matches = match_pattern_group('high_danger_commands', command)
    for pattern_type, _ in high_danger_matches:
        if pattern_type in ERROR_MESSAGES:
            issues.append(ERROR_MESSAGES[pattern_type])
    
    # If high-danger patterns found, return immediately for performance
    if issues:
        cache_result(cache_key, issues, ttl_override=300)
        return issues
    
    # Check medium-danger patterns
    medium_danger_matches = match_pattern_group('medium_danger_commands', command)
    for pattern_type, _ in medium_danger_matches:
        if pattern_type in ERROR_MESSAGES:
            issues.append(ERROR_MESSAGES[pattern_type])
    
    # If medium-danger patterns found, return for performance
    if issues:
        cache_result(cache_key, issues, ttl_override=300)
        return issues
    
    # Check low-danger patterns (least critical, checked last)
    low_danger_matches = match_pattern_group('low_danger_commands', command)
    for pattern_type, _ in low_danger_matches:
        if pattern_type in ERROR_MESSAGES:
            issues.append(ERROR_MESSAGES[pattern_type])
    
    # Cache result
    cache_result(cache_key, issues, ttl_override=300)
    return issues

@performance_decorator("prevent_unsafe_commands")
def main():
    """Main function with performance monitoring and optimization."""
    try:
        input_data = json.load(sys.stdin)
    except json.JSONDecodeError as e:
        print(f"Error: Invalid JSON input: {e}", file=sys.stderr)
        sys.exit(1)

    tool_name = input_data.get("tool_name", "")
    tool_input = input_data.get("tool_input", {})
    command = tool_input.get("command", "")

    if tool_name != "Bash" or not command:
        sys.exit(1)

    # Check if bash safety checks are enabled (cached)
    preferences = get_preferences()
    bash_safety_checks = preferences.get('bash_safety_checks', {})
    if not bash_safety_checks.get('enabled', True):
        print(f"Skipping bash safety checks.")
        sys.exit(0)

    # Ensure patterns are compiled before validation
    _compile_unsafe_command_patterns()
    
    # Validate the command (optimized with caching)
    issues = validate_command(command)

    if issues:
        output = {
            "continue": True,
            "stopReason": f"Unsafe command blocked, requires Human approval: {'; '.join(issues)}",
            "suppressOutput": False,
            "hookSpecificOutput": {
                "hookEventName": "PreToolUse",
                "permissionDecision": "ask",
                "permissionDecisionReason": f"Unsafe command blocked, requires Human approval: {'; '.join(issues)}"
            }
        }
        log_decision(output, operation_type="unsafe_command_decision")
        print(json.dumps(output))
        sys.exit(2)

if __name__ == "__main__":
    main()