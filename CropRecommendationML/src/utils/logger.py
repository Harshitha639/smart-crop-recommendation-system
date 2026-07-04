# -*- coding: utf-8 -*-
"""
Logger utility module
Sets up a structured log format for printing outputs to stdout and a file.
"""

import logging
import os
import sys

def get_logger(name: str = "CropRecommendationSystem") -> logging.Logger:
    """
    Configure and retrieve a custom logger that writes messages to console and a log file.
    
    Args:
        name (str): Name of the logger.
        
    Returns:
        logging.Logger: Configured logger object.
    """
    logger = logging.getLogger(name)
    
    # Avoid duplicate handlers if logger is already configured
    if logger.handlers:
        return logger
        
    logger.setLevel(logging.INFO)
    
    # Format description
    log_format = logging.Formatter(
        "[%(asctime)s] [%(levelname)s] [%(name)s:%(filename)s:%(lineno)d] - %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )
    
    # Console Handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(log_format)
    console_handler.setLevel(logging.INFO)
    logger.addHandler(console_handler)
    
    # Log File Handler
    logs_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "reports")
    os.makedirs(logs_dir, exist_ok=True)
    log_file_path = os.path.join(logs_dir, "pipeline_execution.log")
    
    try:
        file_handler = logging.FileHandler(log_file_path, encoding="utf-8")
        file_handler.setFormatter(log_format)
        file_handler.setLevel(logging.INFO)
        logger.addHandler(file_handler)
    except Exception as e:
        logger.warning(f"Failed to initialize file logger due to: {e}. Output will be printed to console only.")
        
    return logger
