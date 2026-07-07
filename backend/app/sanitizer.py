def sanitize_csv_cell(value: str) -> str:
    """
    Prevents CSV Formula Injection (Excel Injection) by escaping
    any string value that starts with =, +, -, or @.
    Prefixes the cell with a single quote (') if it starts with these characters.
    """
    if not value:
        return ""
        
    s_value = str(value).strip()
    if s_value and s_value[0] in ('=', '+', '-', '@'):
        # Escape by prefixing with a single quote
        return f"'{s_value}"
        
    return value
