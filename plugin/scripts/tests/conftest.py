"""
Pytest configuration and shared fixtures for implement.py tests.
"""

import sys
from pathlib import Path

# Add the scripts directory to the Python path so we can import implement
scripts_dir = Path(__file__).parent.parent
sys.path.insert(0, str(scripts_dir))
