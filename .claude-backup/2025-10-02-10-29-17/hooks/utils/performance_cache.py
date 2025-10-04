#!/usr/bin/env python3
"""
High-performance caching and optimization utilities for security hooks.
This module provides intelligent caching, pre-compiled patterns, and performance monitoring.
"""

import re
import json
import time
import sqlite3
import threading
import functools
from pathlib import Path
from typing import Dict, List, Tuple, Optional, Any, Pattern
from collections import OrderedDict
from dataclasses import dataclass
from datetime import datetime, timedelta


@dataclass
class PerformanceMetrics:
    """Track performance metrics for monitoring."""
    hook_name: str
    execution_time: float
    cache_hits: int
    cache_misses: int
    patterns_matched: int
    memory_usage_mb: float
    timestamp: datetime


class LRUCache:
    """
    Thread-safe LRU cache with TTL support for pattern matching results.
    Optimized for high-performance security hook operations.
    """
    
    def __init__(self, max_size: int = 10000, ttl_seconds: int = 300):
        self.max_size = max_size
        self.ttl_seconds = ttl_seconds
        self.cache = OrderedDict()
        self.timestamps = {}
        self.lock = threading.RLock()
        self.hits = 0
        self.misses = 0
    
    def _cleanup_expired(self):
        """Remove expired entries based on TTL."""
        current_time = time.time()
        expired_keys = [
            key for key, timestamp in self.timestamps.items()
            if current_time - timestamp > self.ttl_seconds
        ]
        for key in expired_keys:
            self.cache.pop(key, None)
            self.timestamps.pop(key, None)
    
    def get(self, key: str) -> Optional[Any]:
        """Get value from cache with automatic cleanup."""
        with self.lock:
            self._cleanup_expired()
            
            if key in self.cache:
                # Move to end (most recently used)
                value = self.cache.pop(key)
                self.cache[key] = value
                self.hits += 1
                return value
            
            self.misses += 1
            return None
    
    def put(self, key: str, value: Any):
        """Store value in cache with timestamp."""
        with self.lock:
            self._cleanup_expired()
            
            # Remove oldest entries if at capacity
            while len(self.cache) >= self.max_size:
                oldest_key = next(iter(self.cache))
                self.cache.pop(oldest_key)
                self.timestamps.pop(oldest_key, None)
            
            self.cache[key] = value
            self.timestamps[key] = time.time()
    
    def get_stats(self) -> Dict[str, int]:
        """Get cache performance statistics."""
        total_requests = self.hits + self.misses
        hit_rate = (self.hits / total_requests * 100) if total_requests > 0 else 0
        
        return {
            'hits': self.hits,
            'misses': self.misses,
            'hit_rate_percent': hit_rate,
            'size': len(self.cache)
        }


class CompiledPatternCache:
    """
    Pre-compiled regex pattern cache with lazy loading and high-performance matching.
    Patterns are compiled once and reused across all hook executions.
    """
    
    def __init__(self):
        self._patterns: Dict[str, Pattern] = {}
        self._pattern_groups: Dict[str, List[Tuple[Pattern, str]]] = {}
        self.lock = threading.RLock()
    
    def compile_pattern(self, pattern: str, flags: int = 0) -> Pattern:
        """Compile a single regex pattern with caching."""
        cache_key = f"{pattern}:{flags}"
        
        with self.lock:
            if cache_key not in self._patterns:
                try:
                    self._patterns[cache_key] = re.compile(pattern, flags)
                except re.error as e:
                    # Log error but don't fail - return a pattern that never matches
                    self._patterns[cache_key] = re.compile(r'(?!.*)', flags)
            
            return self._patterns[cache_key]
    
    def compile_pattern_group(self, group_name: str, patterns: List[Tuple[str, str]], flags: int = 0):
        """Compile a group of patterns for batch matching."""
        with self.lock:
            if group_name not in self._pattern_groups:
                compiled_patterns = []
                for pattern, identifier in patterns:
                    compiled_pattern = self.compile_pattern(pattern, flags)
                    compiled_patterns.append((compiled_pattern, identifier))
                self._pattern_groups[group_name] = compiled_patterns
    
    def match_pattern_group(self, group_name: str, text: str) -> List[Tuple[str, str]]:
        """Match text against a group of compiled patterns efficiently."""
        matches = []
        
        with self.lock:
            if group_name in self._pattern_groups:
                for pattern, identifier in self._pattern_groups[group_name]:
                    if pattern.search(text):
                        matches.append((identifier, pattern.pattern))
        
        return matches
    
    def get_pattern_count(self) -> int:
        """Get total number of compiled patterns."""
        return len(self._patterns)


class PreferencesCache:
    """
    High-performance preferences caching with automatic refresh and change detection.
    Reduces file I/O operations significantly.
    """
    
    def __init__(self, cache_duration_seconds: int = 60):
        self.cache_duration = cache_duration_seconds
        self._cached_data: Optional[Dict] = None
        self._cache_timestamp: float = 0
        self._file_mtime: float = 0
        self.lock = threading.RLock()
        self.preferences_path = Path('.claude/preferences.json')
    
    def get_preferences(self) -> Dict:
        """Get preferences with intelligent caching and change detection."""
        with self.lock:
            current_time = time.time()
            should_refresh = False
            
            # Check if cache is expired
            if current_time - self._cache_timestamp > self.cache_duration:
                should_refresh = True
            
            # Check if file was modified
            if self.preferences_path.exists():
                file_mtime = self.preferences_path.stat().st_mtime
                if file_mtime != self._file_mtime:
                    should_refresh = True
                    self._file_mtime = file_mtime
            
            if should_refresh or self._cached_data is None:
                self._cached_data = self._load_preferences()
                self._cache_timestamp = current_time
            
            return self._cached_data or {}
    
    def _load_preferences(self) -> Dict:
        """Load preferences from file with error handling."""
        try:
            if self.preferences_path.exists():
                with open(self.preferences_path, 'r') as f:
                    return json.load(f)
        except (FileNotFoundError, json.JSONDecodeError, PermissionError):
            pass
        return {}


class PerformanceMonitor:
    """
    Comprehensive performance monitoring and alerting for security hooks.
    Tracks execution times, cache performance, and system resource usage.
    """
    
    def __init__(self):
        self.metrics: List[PerformanceMetrics] = []
        self.lock = threading.RLock()
        self.db_path = Path('.claude/logs/performance.sqlite')
        self._init_database()
    
    def _init_database(self):
        """Initialize performance monitoring database."""
        try:
            self.db_path.parent.mkdir(parents=True, exist_ok=True)
            
            with sqlite3.connect(self.db_path) as conn:
                conn.execute('''
                    CREATE TABLE IF NOT EXISTS performance_metrics (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        hook_name TEXT NOT NULL,
                        execution_time REAL NOT NULL,
                        cache_hits INTEGER DEFAULT 0,
                        cache_misses INTEGER DEFAULT 0,
                        patterns_matched INTEGER DEFAULT 0,
                        memory_usage_mb REAL DEFAULT 0,
                        timestamp TEXT NOT NULL,
                        created_at TEXT DEFAULT CURRENT_TIMESTAMP
                    )
                ''')
                
                # Create index for efficient querying
                conn.execute('''
                    CREATE INDEX IF NOT EXISTS idx_hook_timestamp 
                    ON performance_metrics(hook_name, timestamp)
                ''')
                
                conn.commit()
        except Exception:
            # Don't fail if database can't be initialized
            pass
    
    def record_metric(self, metric: PerformanceMetrics):
        """Record a performance metric with database storage."""
        with self.lock:
            self.metrics.append(metric)
            
            # Keep only last 1000 metrics in memory
            if len(self.metrics) > 1000:
                self.metrics = self.metrics[-1000:]
            
            # Store to database asynchronously
            self._store_to_database(metric)
    
    def _store_to_database(self, metric: PerformanceMetrics):
        """Store metric to database with error handling."""
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.execute('''
                    INSERT INTO performance_metrics 
                    (hook_name, execution_time, cache_hits, cache_misses, 
                     patterns_matched, memory_usage_mb, timestamp)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                ''', (
                    metric.hook_name,
                    metric.execution_time,
                    metric.cache_hits,
                    metric.cache_misses,
                    metric.patterns_matched,
                    metric.memory_usage_mb,
                    metric.timestamp.isoformat()
                ))
        except Exception:
            # Don't fail hook execution if logging fails
            pass
    
    def get_average_execution_time(self, hook_name: str, hours: int = 1) -> float:
        """Get average execution time for a hook over the specified time period."""
        cutoff_time = datetime.now() - timedelta(hours=hours)
        
        with self.lock:
            relevant_metrics = [
                m for m in self.metrics
                if m.hook_name == hook_name and m.timestamp >= cutoff_time
            ]
            
            if not relevant_metrics:
                return 0.0
            
            return sum(m.execution_time for m in relevant_metrics) / len(relevant_metrics)
    
    def check_performance_alerts(self, hook_name: str, execution_time: float) -> List[str]:
        """Check for performance alerts and return warning messages."""
        alerts = []
        
        # Alert if execution time exceeds 100ms
        if execution_time > 0.1:
            alerts.append(f"Hook {hook_name} exceeded 100ms threshold: {execution_time:.3f}s")
        
        # Alert if execution time is significantly higher than average
        avg_time = self.get_average_execution_time(hook_name)
        if avg_time > 0 and execution_time > avg_time * 3:
            alerts.append(f"Hook {hook_name} execution time 3x higher than average: {execution_time:.3f}s vs {avg_time:.3f}s")
        
        return alerts


# Global instances for shared use across all hooks
_pattern_cache = CompiledPatternCache()
_result_cache = LRUCache(max_size=10000, ttl_seconds=300)
_preferences_cache = PreferencesCache()
_performance_monitor = PerformanceMonitor()


def performance_decorator(hook_name: str):
    """
    Decorator to automatically measure and cache hook performance.
    Usage: @performance_decorator("hook_name")
    """
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            start_time = time.time()
            
            try:
                result = func(*args, **kwargs)
                
                # Record performance metrics
                execution_time = time.time() - start_time
                cache_stats = _result_cache.get_stats()
                
                metric = PerformanceMetrics(
                    hook_name=hook_name,
                    execution_time=execution_time,
                    cache_hits=cache_stats['hits'],
                    cache_misses=cache_stats['misses'],
                    patterns_matched=0,  # To be updated by hook
                    memory_usage_mb=0,   # To be updated if needed
                    timestamp=datetime.now()
                )
                
                _performance_monitor.record_metric(metric)
                
                # Check for performance alerts
                alerts = _performance_monitor.check_performance_alerts(hook_name, execution_time)
                for alert in alerts:
                    # Log to stderr without blocking
                    import sys
                    print(f"PERFORMANCE ALERT: {alert}", file=sys.stderr)
                
                return result
                
            except Exception as e:
                # Record failed execution
                execution_time = time.time() - start_time
                metric = PerformanceMetrics(
                    hook_name=f"{hook_name}_failed",
                    execution_time=execution_time,
                    cache_hits=0,
                    cache_misses=0,
                    patterns_matched=0,
                    memory_usage_mb=0,
                    timestamp=datetime.now()
                )
                _performance_monitor.record_metric(metric)
                raise
        
        return wrapper
    return decorator


# Public API functions
def get_compiled_pattern(pattern: str, flags: int = 0) -> Pattern:
    """Get a compiled regex pattern from the global cache."""
    return _pattern_cache.compile_pattern(pattern, flags)


def compile_pattern_group(group_name: str, patterns: List[Tuple[str, str]], flags: int = 0):
    """Compile a group of patterns for efficient batch matching."""
    _pattern_cache.compile_pattern_group(group_name, patterns, flags)


def match_pattern_group(group_name: str, text: str) -> List[Tuple[str, str]]:
    """Match text against a compiled pattern group."""
    return _pattern_cache.match_pattern_group(group_name, text)


def cache_result(key: str, value: Any, ttl_override: Optional[int] = None):
    """Cache a computation result."""
    if ttl_override:
        # Create temporary cache with different TTL
        temp_cache = LRUCache(max_size=1000, ttl_seconds=ttl_override)
        temp_cache.put(key, value)
    else:
        _result_cache.put(key, value)


def get_cached_result(key: str) -> Optional[Any]:
    """Get a cached computation result."""
    return _result_cache.get(key)


def get_preferences() -> Dict:
    """Get preferences with high-performance caching."""
    return _preferences_cache.get_preferences()


def get_cache_stats() -> Dict:
    """Get comprehensive cache performance statistics."""
    return {
        'result_cache': _result_cache.get_stats(),
        'pattern_count': _pattern_cache.get_pattern_count(),
        'preferences_cache_age': time.time() - _preferences_cache._cache_timestamp
    }


def reset_caches():
    """Reset all caches - useful for testing or memory management."""
    global _result_cache, _pattern_cache, _preferences_cache
    _result_cache = LRUCache(max_size=10000, ttl_seconds=300)
    _pattern_cache = CompiledPatternCache()
    _preferences_cache = PreferencesCache()


def get_performance_report(hook_name: Optional[str] = None, hours: int = 1) -> Dict:
    """Get comprehensive performance report."""
    if hook_name:
        avg_time = _performance_monitor.get_average_execution_time(hook_name, hours)
        return {
            'hook_name': hook_name,
            'average_execution_time': avg_time,
            'cache_stats': get_cache_stats()
        }
    else:
        return {
            'cache_stats': get_cache_stats(),
            'performance_monitor': 'enabled'
        }