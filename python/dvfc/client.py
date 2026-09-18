"""
DataVizFactoryClient - interface to build dashboards
"""

import json
import os
import shutil
import subprocess
import tempfile
from pathlib import Path
from typing import Optional, Union

import yaml

from .spec import DashboardSpec


class DataVizFactoryClient:
    """
    Client for building Data Viz Factory dashboards.
    
    Shells to the Node.js CLI or emits IR for rendering.
    """

    def __init__(self, cli_path: Optional[str] = None):
        """
        Initialize the client.
        
        Args:
            cli_path: Path to dvfc CLI. If None, searches PATH.
        """
        self.cli_path = cli_path or self._find_cli()

    def _find_cli(self) -> str:
        """Find dvfc CLI in PATH or common locations"""
        # Try PATH
        cli_path = shutil.which("dvfc")
        if cli_path:
            return cli_path
        
        # Try relative to this file (for development)
        package_dir = Path(__file__).parent.parent.parent
        node_cli = package_dir / "packages" / "cli" / "dist" / "cli.js"
        if node_cli.exists():
            # Return node command with cli.js
            return f"node {node_cli}"
        
        raise RuntimeError(
            "Could not find dvfc CLI. "
            "Install dvfc npm package or set cli_path explicitly."
        )

    def build(
        self,
        spec: Union[DashboardSpec, str, Path],
        out_dir: str = "dist",
        minify: bool = False,
    ) -> Path:
        """
        Build a dashboard to static HTML.
        
        Args:
            spec: Dashboard spec object, YAML path, or JSON path
            out_dir: Output directory
            minify: Whether to minify output
            
        Returns:
            Path to generated index.html
        """
        if isinstance(spec, DashboardSpec):
            # Write spec to temp file
            with tempfile.NamedTemporaryFile(
                mode="w", suffix=".yaml", delete=False
            ) as f:
                data = spec.model_dump(by_alias=True, exclude_none=True, mode='json')
                yaml.dump(data, f, default_flow_style=False, sort_keys=False)
                spec_path = f.name
        else:
            spec_path = str(spec)
        
        try:
            # Build command
            cmd = self.cli_path.split() + ["build", spec_path, "-o", out_dir]
            if minify:
                cmd.append("--minify")
            
            # Run CLI
            result = subprocess.run(
                cmd,
                check=True,
                capture_output=True,
                text=True,
            )
            
            # Return path to output
            return Path(out_dir) / "index.html"
        
        finally:
            # Clean up temp file if we created one
            if isinstance(spec, DashboardSpec):
                os.unlink(spec_path)

    def validate(self, spec: Union[DashboardSpec, str, Path]) -> bool:
        """
        Validate a dashboard spec.
        
        Args:
            spec: Dashboard spec object, YAML path, or JSON path
            
        Returns:
            True if valid, False otherwise
        """
        if isinstance(spec, DashboardSpec):
            # Write spec to temp file
            with tempfile.NamedTemporaryFile(
                mode="w", suffix=".yaml", delete=False
            ) as f:
                data = spec.model_dump(by_alias=True, exclude_none=True, mode='json')
                yaml.dump(data, f, default_flow_style=False, sort_keys=False)
                spec_path = f.name
        else:
            spec_path = str(spec)
        
        try:
            # Build command
            cmd = self.cli_path.split() + ["validate", spec_path]
            
            # Run CLI
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
            )
            
            return result.returncode == 0
        
        finally:
            # Clean up temp file if we created one
            if isinstance(spec, DashboardSpec):
                os.unlink(spec_path)

    def to_yaml(self, spec: DashboardSpec) -> str:
        """Convert spec to YAML string"""
        # Convert to dict with enum values as strings
        data = spec.model_dump(by_alias=True, exclude_none=True, mode='json')
        return yaml.dump(data, default_flow_style=False, sort_keys=False)

    def to_json(self, spec: DashboardSpec) -> str:
        """Convert spec to JSON string"""
        return spec.model_dump_json(by_alias=True, exclude_none=True, indent=2)

    def to_html(
        self,
        spec: DashboardSpec,
        out_path: Optional[Union[str, Path]] = None,
        minify: bool = False,
    ) -> str:
        """
        Build dashboard and return HTML content.
        
        Args:
            spec: Dashboard specification
            out_path: If provided, write HTML to this path
            minify: Whether to minify output
            
        Returns:
            HTML content as string
        """
        with tempfile.TemporaryDirectory() as tmpdir:
            html_path = self.build(spec, out_dir=tmpdir, minify=minify)
            html = html_path.read_text()
            
            if out_path:
                Path(out_path).write_text(html)
            
            return html
