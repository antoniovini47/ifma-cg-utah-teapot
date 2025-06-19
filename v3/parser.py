import json

def parse_teapot_data(data_string):
    """
    Parses the raw Utah Teapot data string and converts it into a structured
    Python dictionary, which can then be serialized to JSON.

    The format is based on the provided text, which defines an array of surfaces,
    where each surface contains a 4x4 grid of 3D control points (pt).
    """
    surfaces = []
    
    # Split the data string by 'surface(' to get individual surface definitions.
    # The first split will be empty or contain comments, so we skip it.
    surface_blocks = data_string.split('surface(')[1:]

    for block in surface_blocks:
        # Each block starts with degree and knot information, then the array of points.
        # We need to find the array part.
        try:
            # Extract parameters like degrees and knot types
            # Example: 4, "ec_open", "kv_bezier", 4, "ec_open", "kv_bezier",
            param_end_idx = block.find('array(')
            if param_end_idx == -1:
                raise ValueError("Could not find 'array(' in surface block.")

            param_str = block[:param_end_idx].strip()
            
            # Simple regex-like parsing for parameters.
            # Assuming format: u_degree, "u_knot_type", "u_basis", v_degree, "v_knot_type", "v_basis",
            parts = [p.strip() for p in param_str.split(',')]
            
            u_degree = int(parts[0])
            u_knot_type = parts[1].strip('"')
            u_basis = parts[2].strip('"')
            v_degree = int(parts[3])
            v_knot_type = parts[4].strip('"')
            v_basis = parts[5].strip('"')

            # Extract the raw control points array string
            points_array_str = block[param_end_idx + len('array('):]
            # Find the matching closing parenthesis for the outermost array
            open_paren_count = 1
            close_paren_idx = -1
            for i, char in enumerate(points_array_str):
                if char == '(':
                    open_paren_count += 1
                elif char == ')':
                    open_paren_count -= 1
                if open_paren_count == 0:
                    close_paren_idx = i
                    break
            
            if close_paren_idx == -1:
                raise ValueError("Mismatched parentheses in points array.")

            points_array_str = points_array_str[:close_paren_idx].strip()

            # Now parse the 4x4 array of points
            control_points = []
            # Split by 'array(' to get rows, then parse points in each row
            row_blocks = points_array_str.split('array(')[1:]

            for row_block in row_blocks:
                current_row = []
                # Split by 'pt(' to get individual points
                point_strs = row_block.split('pt(')[1:]
                for pt_str in point_strs:
                    # Remove trailing ')' and split by ','
                    coords_str = pt_str.split(')')[0].strip()
                    x, y, z = map(float, coords_str.split(','))
                    current_row.append([x, y, z])
                control_points.append(current_row)
            
            surfaces.append({
                "u_degree": u_degree,
                "u_knot_type": u_knot_type,
                "u_basis": u_basis,
                "v_degree": v_degree,
                "v_knot_type": v_knot_type,
                "v_basis": v_basis,
                "control_points": control_points
            })

        except Exception as e:
            print(f"Error parsing surface block: {block[:200]}... Error: {e}")
            continue

    return {"TeaSrfs": surfaces}

# Example usage:
# Assume 'teapot_raw_data' contains the entire string you provided in the prompt.
# You would load this from a file in a real scenario.
teapot_raw_data = """
#
# teapot: this is the original non-rational bezier teapot data. the data
#         comes from Martin Newel and Jim Blinn.
#
# Thomas V Thompson II
# January 28 2000
#

TeaSrfs: array(
    surface( 4, "ec_open", "kv_bezier", 4, "ec_open", "kv_bezier",
	array(
	    array( pt( 1.4, 2.25, 0.0 ),
                   pt( 1.3375, 2.38125, 0.0 ),
                   pt( 1.4375, 2.38125, 0.0 ),
                   pt( 1.5, 2.25, 0.0 ) ),
	    array( pt( 1.4, 2.25, 0.784 ),
                   pt( 1.3375, 2.38125, 0.749 ),
                   pt( 1.4375, 2.38125, 0.805 ),
                   pt( 1.5, 2.25, 0.84 ) ),
	    array( pt( 0.784, 2.25, 1.4 ),
                   pt( 0.749, 2.38125, 1.3375 ),
                   pt( 0.805, 2.38125, 1.4375 ),
                   pt( 0.84, 2.25, 1.5 ) ),
	    array( pt( 0.0, 2.25, 1.4 ),
                   pt( 0.0, 2.38125, 1.3375 ),
                   pt( 0.0, 2.38125, 1.4375 ),
                   pt( 0.0, 2.25, 1.5 ) ) ) ),
    surface( 4, "ec_open", "kv_bezier", 4, "ec_open", "kv_bezier",
	array(
	    array( pt( 0.0, 2.25, 1.4 ),
                   pt( 0.0, 2.38125, 1.3375 ),
                   pt( 0.0, 2.38125, 1.4375 ),
                   pt( 0.0, 2.25, 1.5 ) ),
	    array( pt( -0.784, 2.25, 1.4 ),
                   pt( -0.749, 2.38125, 1.3375 ),
                   pt( -0.805, 2.38125, 1.4375 ),
                   pt( -0.84, 2.25, 1.5 ) ),
	    array( pt( -1.4, 2.25, 0.784 ),
                   pt( -1.3375, 2.38125, 0.749 ),
                   pt( -1.4375, 2.38125, 0.805 ),
                   pt( -1.5, 2.25, 0.84 ) ),
	    array( pt( -1.4, 2.25, 0.0 ),
                   pt( -1.3375, 2.38125, 0.0 ),
                   pt( -1.4375, 2.38125, 0.0 ),
                   pt( -1.5, 2.25, 0.0 ) ) ) ),
    surface( 4, "ec_open", "kv_bezier", 4, "ec_open", "kv_bezier",
	array(
	    array( pt( -1.4, 2.25, 0.0 ),
                   pt( -1.3375, 2.38125, 0.0 ),
                   pt( -1.4375, 2.38125, 0.0 ),
                   pt( -1.5, 2.25, 0.0 ) ),
	    array( pt( -1.4, 2.25, -0.784 ),
                   pt( -1.3375, 2.38125, -0.749 ),
                   pt( -1.4375, 2.38125, -0.805 ),
                   pt( -1.5, 2.25, -0.84 ) ),
	    array( pt( -0.784, 2.25, -1.4 ),
                   pt( -0.749, 2.38125, -1.3375 ),
                   pt( -0.805, 2.38125, -1.4375 ),
                   pt( -0.84, 2.25, -1.5 ) ),
	    array( pt( 0.0, 2.25, -1.4 ),
                   pt( 0.0, 2.38125, -1.3375 ),
                   pt( 0.0, 2.38125, -1.4375 ),
                   pt( 0.0, 2.25, -1.5 ) ) ) ),
    surface( 4, "ec_open", "kv_bezier", 4, "ec_open", "kv_bezier",
	array(
	    array( pt( 0.0, 2.25, -1.4 ),
                   pt( 0.0, 2.38125, -1.3375 ),
                   pt( 0.0, 2.38125, -1.4375 ),
                   pt( 0.0, 2.25, -1.5 ) ),
	    array( pt( 0.784, 2.25, -1.4 ),
                   pt( 0.749, 2.38125, -1.3375 ),
                   pt( 0.805, 2.38125, -1.4375 ),
                   pt( 0.84, 2.25, -1.5 ) ),
	    array( pt( 1.4, 2.25, -0.784 ),
                   pt( 1.3375, 2.38125, -0.749 ),
                   pt( 1.4375, 2.38125, -0.805 ),
                   pt( 1.5, 2.25, -0.84 ) ),
	    array( pt( 1.4, 2.25, 0.0 ),
                   pt( 1.3375, 2.38125, 0.0 ),
                   pt( 1.4375, 2.38125, 0.0 ),
                   pt( 1.5, 2.25, 0.0 ) ) ) ),
    surface( 4, "ec_open", "kv_bezier", 4, "ec_open", "kv_bezier",
	array(
	    array( pt( 1.5, 2.25, 0.0 ),
                   pt( 1.75, 1.725, 0.0 ),
                   pt( 2, 1.2, 0.0 ),
                   pt( 2, 0.75, 0.0 ) ),
	    array( pt( 1.5, 2.25, 0.84 ),
                   pt( 1.75, 1.725, 0.98 ),
                   pt( 2, 1.2, 1.12 ),
                   pt( 2, 0.75, 1.12 ) ),
	    array( pt( 0.84, 2.25, 1.5 ),
                   pt( 0.98, 1.725, 1.75 ),
                   pt( 1.12, 1.2, 2 ),
                   pt( 1.12, 0.75, 2 ) ),
	    array( pt( 0.0, 2.25, 1.5 ),
                   pt( 0.0, 1.725, 1.75 ),
                   pt( 0.0, 1.2, 2 ),
                   pt( 0.0, 0.75, 2 ) ) ) ),
    surface( 4, "ec_open", "kv_bezier", 4, "ec_open", "kv_bezier",
	array(
	    array( pt( 0.0, 2.25, 1.5 ),
                   pt( 0.0, 1.725, 1.75 ),
                   pt( 0.0, 1.2, 2 ),
                   pt( 0.0, 0.75, 2 ) ),
	    array( pt( -0.84, 2.25, 1.5 ),
                   pt( -0.98, 1.725, 1.75 ),
                   pt( -1.12, 1.2, 2 ),
                   pt( -1.12, 0.75, 2 ) ),
	    array( pt( -1.5, 2.25, 0.84 ),
                   pt( -1.75, 1.725, 0.98 ),
                   pt( -2, 1.2, 1.12 ),
                   pt( -2, 0.75, 1.12 ) ),
	    array( pt( -1.5, 2.25, 0.0 ),
                   pt( -1.75, 1.725, 0.0 ),
                   pt( -2, 1.2, 0.0 ),
                   pt( -2, 0.75, 0.0 ) ) ) ),
    surface( 4, "ec_open", "kv_bezier", 4, "ec_open", "kv_bezier",
	array(
	    array( pt( -1.5, 2.25, 0.0 ),
                   pt( -1.75, 1.725, 0.0 ),
                   pt( -2, 1.2, 0.0 ),
                   pt( -2, 0.75, 0.0 ) ),
	    array( pt( -1.5, 2.25, -0.84 ),
                   pt( -1.75, 1.725, -0.98 ),
                   pt( -2, 1.2, -1.12 ),
                   pt( -2, 0.75, -1.12 ) ),
	    array( pt( -0.84, 2.25, -1.5 ),
                   pt( -0.98, 1.725, -1.75 ),
                   pt( -1.12, 1.2, -2 ),
                   pt( -1.12, 0.75, -2 ) ),
	    array( pt( 0.0, 2.25, -1.5 ),
                   pt( 0.0, 1.725, -1.75 ),
                   pt( 0.0, 1.2, -2 ),
                   pt( 0.0, 0.75, -2 ) ) ) ),
    surface( 4, "ec_open", "kv_bezier", 4, "ec_open", "kv_bezier",
	array(
	    array( pt( 0.0, 2.25, -1.5 ),
                   pt( 0.0, 1.725, -1.75 ),
                   pt( 0.0, 1.2, -2 ),
                   pt( 0.0, 0.75, -2 ) ),
	    array( pt( 0.84, 2.25, -1.5 ),
                   pt( 0.98, 1.725, -1.75 ),
                   pt( 1.12, 1.2, -2 ),
                   pt( 1.12, 0.75, -2 ) ),
	    array( pt( 1.5, 2.25, -0.84 ),
                   pt( 1.75, 1.725, -0.98 ),
                   pt( 2, 1.2, -1.12 ),
                   pt( 2, 0.75, -1.12 ) ),
	    array( pt( 1.5, 2.25, 0.0 ),
                   pt( 1.75, 1.725, 0.0 ),
                   pt( 2, 1.2, 0.0 ),
                   pt( 2, 0.75, 0.0 ) ) ) ),
    surface( 4, "ec_open", "kv_bezier", 4, "ec_open", "kv_bezier",
	array(
	    array( pt( 2, 0.75, 0.0 ),
                   pt( 2, 0.3, 0.0 ),
                   pt( 1.5, 0.075, 0.0 ),
                   pt( 1.5, 0.0, 0.0 ) ),
	    array( pt( 2, 0.75, 1.12 ),
                   pt( 2, 0.3, 1.12 ),
                   pt( 1.5, 0.075, 0.84 ),
                   pt( 1.5, 0.0, 0.84 ) ),
	    array( pt( 1.12, 0.75, 2 ),
                   pt( 1.12, 0.3, 2 ),
                   pt( 0.84, 0.075, 1.5 ),
                   pt( 0.84, 0.0, 1.5 ) ),
	    array( pt( 0.0, 0.75, 2 ),
                   pt( 0.0, 0.3, 2 ),
                   pt( 0.0, 0.075, 1.5 ),
                   pt( 0.0, 0.0, 1.5 ) ) ) ),
    surface( 4, "ec_open", "kv_bezier", 4, "ec_open", "kv_bezier",
	array(
	    array( pt( 0.0, 0.75, 2 ),
                   pt( 0.0, 0.3, 2 ),
                   pt( 0.0, 0.075, 1.5 ),
                   pt( 0.0, 0.0, 1.5 ) ),
	    array( pt( -1.12, 0.75, 2 ),
                   pt( -1.12, 0.3, 2 ),
                   pt( -0.84, 0.075, 1.5 ),
                   pt( -0.84, 0.0, 1.5 ) ),
	    array( pt( -2, 0.75, 1.12 ),
                   pt( -2, 0.3, 1.12 ),
                   pt( -1.5, 0.075, 0.84 ),
                   pt( -1.5, 0.0, 0.84 ) ),
	    array( pt( -2, 0.75, 0.0 ),
                   pt( -2, 0.3, 0.0 ),
                   pt( -1.5, 0.075, 0.0 ),
                   pt( -1.5, 0.0, 0.0 ) ) ) ),
    surface( 4, "ec_open", "kv_bezier", 4, "ec_open", "kv_bezier",
	array(
	    array( pt( -2, 0.75, 0.0 ),
                   pt( -2, 0.3, 0.0 ),
                   pt( -1.5, 0.075, 0.0 ),
                   pt( -1.5, 0.0, 0.0 ) ),
	    array( pt( -2, 0.75, -1.12 ),
                   pt( -2, 0.3, -1.12 ),
                   pt( -1.5, 0.075, -0.84 ),
                   pt( -1.5, 0.0, -0.84 ) ),
	    array( pt( -1.12, 0.75, -2 ),
                   pt( -1.12, 0.3, -2 ),
                   pt( -0.84, 0.075, -1.5 ),
                   pt( -0.84, 0.0, -1.5 ) ),
	    array( pt( 0.0, 0.75, -2 ),
                   pt( 0.0, 0.3, -2 ),
                   pt( 0.0, 0.075, -1.5 ),
                   pt( 0.0, 0.0, -1.5 ) ) ) ),
    surface( 4, "ec_open", "kv_bezier", 4, "ec_open", "kv_bezier",
	array(
	    array( pt( 0.0, 0.75, -2 ),
                   pt( 0.0, 0.3, -2 ),
                   pt( 0.0, 0.075, -1.5 ),
                   pt( 0.0, 0.0, -1.5 ) ),
	    array( pt( 1.12, 0.75, -2 ),
                   pt( 1.12, 0.3, -2 ),
                   pt( 0.84, 0.075, -1.5 ),
                   pt( 0.84, 0.0, -1.5 ) ),
	    array( pt( 2, 0.75, -1.12 ),
                   pt( 2, 0.3, -1.12 ),
                   pt( 1.5, 0.075, -0.84 ),
                   pt( 1.5, 0.0, -0.84 ) ),
	    array( pt( 2, 0.75, 0.0 ),
                   pt( 2, 0.3, 0.0 ),
                   pt( 1.5, 0.075, 0.0 ),
                   pt( 1.5, 0.0, 0.0 ) ) ) ),
    surface( 4, "ec_open", "kv_bezier", 4, "ec_open", "kv_bezier",
	array(
	    array( pt( -1.6, 1.875, 0.0 ),
                   pt( -2.3, 1.875, 0.0 ),
                   pt( -2.7, 1.875, 0.0 ),
                   pt( -2.7, 1.65, 0.0 ) ),
	    array( pt( -1.6, 1.875, 0.3 ),
                   pt( -2.3, 1.875, 0.3 ),
                   pt( -2.7, 1.875, 0.3 ),
                   pt( -2.7, 1.65, 0.3 ) ),
	    array( pt( -1.5, 2.1, 0.3 ),
                   pt( -2.5, 2.1, 0.3 ),
                   pt( -3, 2.1, 0.3 ),
                   pt( -3, 1.65, 0.3 ) ),
	    array( pt( -1.5, 2.1, 0.0 ),
                   pt( -2.5, 2.1, 0.0 ),
                   pt( -3, 2.1, 0.0 ),
                   pt( -3, 1.65, 0.0 ) ) ) ),
    surface( 4, "ec_open", "kv_bezier", 4, "ec_open", "kv_bezier",
	array(
	    array( pt( -1.5, 2.1, 0.0 ),
                   pt( -2.5, 2.1, 0.0 ),
                   pt( -3, 2.1, 0.0 ),
                   pt( -3, 1.65, 0.0 ) ),
	    array( pt( -1.5, 2.1, -0.3 ),
                   pt( -2.5, 2.1, -0.3 ),
                   pt( -3, 2.1, -0.3 ),
                   pt( -3, 1.65, -0.3 ) ),
	    array( pt( -1.6, 1.875, -0.3 ),
                   pt( -2.3, 1.875, -0.3 ),
                   pt( -2.7, 1.875, -0.3 ),
                   pt( -2.7, 1.65, -0.3 ) ),
	    array( pt( -1.6, 1.875, 0.0 ),
                   pt( -2.3, 1.875, 0.0 ),
                   pt( -2.7, 1.875, 0.0 ),
                   pt( -2.7, 1.65, 0.0 ) ) ) ),
    surface( 4, "ec_open", "kv_bezier", 4, "ec_open", "kv_bezier",
	array(
	    array( pt( -2.7, 1.65, 0.0 ),
                   pt( -2.7, 1.425, 0.0 ),
                   pt( -2.5, 0.975, 0.0 ),
                   pt( -2, 0.75, 0.0 ) ),
	    array( pt( -2.7, 1.65, 0.3 ),
                   pt( -2.7, 1.425, 0.3 ),
                   pt( -2.5, 0.975, 0.3 ),
                   pt( -2, 0.75, 0.3 ) ),
	    array( pt( -3, 1.65, 0.3 ),
                   pt( -3, 1.2, 0.3 ),
                   pt( -2.65, 0.7875, 0.3 ),
                   pt( -1.9, 0.45, 0.3 ) ),
	    array( pt( -3, 1.65, 0.0 ),
                   pt( -3, 1.2, 0.0 ),
                   pt( -2.65, 0.7875, 0.0 ),
                   pt( -1.9, 0.45, 0.0 ) ) ) ),
    surface( 4, "ec_open", "kv_bezier", 4, "ec_open", "kv_bezier",
	array(
	    array( pt( -3, 1.65, 0.0 ),
                   pt( -3, 1.2, 0.0 ),
                   pt( -2.65, 0.7875, 0.0 ),
                   pt( -1.9, 0.45, 0.0 ) ),
	    array( pt( -3, 1.65, -0.3 ),
                   pt( -3, 1.2, -0.3 ),
                   pt( -2.65, 0.7875, -0.3 ),
                   pt( -1.9, 0.45, -0.3 ) ),
	    array( pt( -2.7, 1.65, -0.3 ),
                   pt( -2.7, 1.425, -0.3 ),
                   pt( -2.5, 0.975, -0.3 ),
                   pt( -2, 0.75, -0.3 ) ),
	    array( pt( -2.7, 1.65, 0.0 ),
                   pt( -2.7, 1.425, 0.0 ),
                   pt( -2.5, 0.975, 0.0 ),
                   pt( -2, 0.75, 0.0 ) ) ) ),
    surface( 4, "ec_open", "kv_bezier", 4, "ec_open", "kv_bezier",
	array(
	    array( pt( 1.7, 1.275, 0.0 ),
                   pt( 2.6, 1.275, 0.0 ),
                   pt( 2.3, 1.95, 0.0 ),
                   pt( 2.7, 2.25, 0.0 ) ),
	    array( pt( 1.7, 1.275, 0.66 ),
                   pt( 2.6, 1.275, 0.66 ),
                   pt( 2.3, 1.95, 0.25 ),
                   pt( 2.7, 2.25, 0.25 ) ),
	    array( pt( 1.7, 0.45, 0.66 ),
                   pt( 3.1, 0.675, 0.66 ),
                   pt( 2.4, 1.875, 0.25 ),
                   pt( 3.3, 2.25, 0.25 ) ),
	    array( pt( 1.7, 0.45, 0.0 ),
                   pt( 3.1, 0.675, 0.0 ),
                   pt( 2.4, 1.875, 0.0 ),
                   pt( 3.3, 2.25, 0.0 ) ) ) ),
    surface( 4, "ec_open", "kv_bezier", 4, "ec_open", "kv_bezier",
	array(
	    array( pt( 1.7, 0.45, 0.0 ),
                   pt( 3.1, 0.675, 0.0 ),
                   pt( 2.4, 1.875, 0.0 ),
                   pt( 3.3, 2.25, 0.0 ) ),
	    array( pt( 1.7, 0.45, -0.66 ),
                   pt( 3.1, 0.675, -0.66 ),
                   pt( 2.4, 1.875, -0.25 ),
                   pt( 3.3, 2.25, -0.25 ) ),
	    array( pt( 1.7, 1.275, -0.66 ),
                   pt( 2.6, 1.275, -0.66 ),
                   pt( 2.3, 1.95, -0.25 ),
                   pt( 2.7, 2.25, -0.25 ) ),
	    array( pt( 1.7, 1.275, 0.0 ),
                   pt( 2.6, 1.275, 0.0 ),
                   pt( 2.3, 1.95, 0.0 ),
                   pt( 2.7, 2.25, 0.0 ) ) ) ),
    surface( 4, "ec_open", "kv_bezier", 4, "ec_open", "kv_bezier",
	array(
	    array( pt( 2.7, 2.25, 0.0 ),
                   pt( 2.8, 2.325, 0.0 ),
                   pt( 2.9, 2.325, 0.0 ),
                   pt( 2.8, 2.25, 0.0 ) ),
	    array( pt( 2.7, 2.25, 0.25 ),
                   pt( 2.8, 2.325, 0.25 ),
                   pt( 2.9, 2.325, 0.15 ),
                   pt( 2.8, 2.25, 0.15 ) ),
	    array( pt( 3.3, 2.25, 0.25 ),
                   pt( 3.525, 2.34375, 0.25 ),
                   pt( 3.45, 2.3625, 0.15 ),
                   pt( 3.2, 2.25, 0.15 ) ),
	    array( pt( 3.3, 2.25, 0.0 ),
                   pt( 3.525, 2.34375, 0.0 ),
                   pt( 3.45, 2.3625, 0.0 ),
                   pt( 3.2, 2.25, 0.0 ) ) ) ),
    surface( 4, "ec_open", "kv_bezier", 4, "ec_open", "kv_bezier",
	array(
	    array( pt( 3.3, 2.25, 0.0 ),
                   pt( 3.525, 2.34375, 0.0 ),
                   pt( 3.45, 2.3625, 0.0 ),
                   pt( 3.2, 2.25, 0.0 ) ),
	    array( pt( 3.3, 2.25, -0.25 ),
                   pt( 3.525, 2.34375, -0.25 ),
                   pt( 3.45, 2.3625, -0.15 ),
                   pt( 3.2, 2.25, -0.15 ) ),
	    array( pt( 2.7, 2.25, -0.25 ),
                   pt( 2.8, 2.325, -0.25 ),
                   pt( 2.9, 2.325, -0.15 ),
                   pt( 2.8, 2.25, -0.15 ) ),
	    array( pt( 2.7, 2.25, 0.0 ),
                   pt( 2.8, 2.325, 0.0 ),
                   pt( 2.9, 2.325, 0.0 ),
                   pt( 2.8, 2.25, 0.0 ) ) ) ),
    surface( 4, "ec_open", "kv_bezier", 4, "ec_open", "kv_bezier",
	array(
	    array( pt( 0.01, 3, 0.0 ),
                   pt( 0.8, 3, 0.0 ),
                   pt( 0.0, 2.7, 0.0 ),
                   pt( 0.2, 2.55, 0.0 ) ),
	    array( pt( 0.0, 3, 0.01 ),
                   pt( 0.8, 3, 0.45 ),
                   pt( 0.0, 2.7, 0.0 ),
                   pt( 0.2, 2.55, 0.112 ) ),
	    array( pt( 0.01, 3, 0.0 ),
                   pt( 0.45, 3, 0.8 ),
                   pt( 0.0, 2.7, 0.0 ),
                   pt( 0.112, 2.55, 0.2 ) ),
	    array( pt( 0.0, 3, 0.01 ),
                   pt( 0.0, 3, 0.8 ),
                   pt( 0.0, 2.7, 0.0 ),
                   pt( 0.0, 2.55, 0.2 ) ) ) ),
    surface( 4, "ec_open", "kv_bezier", 4, "ec_open", "kv_bezier",
	array(
	    array( pt( 0.0, 3, 0.01 ),
                   pt( 0.0, 3, 0.8 ),
                   pt( 0.0, 2.7, 0.0 ),
                   pt( 0.0, 2.55, 0.2 ) ),
	    array( pt( -0.01, 3, 0.0 ),
                   pt( -0.45, 3, 0.8 ),
                   pt( 0.0, 2.7, 0.0 ),
                   pt( -0.112, 2.55, 0.2 ) ),
	    array( pt( 0.0, 3, 0.01 ),
                   pt( -0.8, 3, 0.45 ),
                   pt( 0.0, 2.7, 0.0 ),
                   pt( -0.2, 2.55, 0.112 ) ),
	    array( pt( -0.01, 3, 0.0 ),
                   pt( -0.8, 3, 0.0 ),
                   pt( 0.0, 2.7, 0.0 ),
                   pt( -0.2, 2.55, 0.0 ) ) ) ),
    surface( 4, "ec_open", "kv_bezier", 4, "ec_open", "kv_bezier",
	array(
	    array( pt( -0.01, 3, 0.0 ),
                   pt( -0.8, 3, 0.0 ),
                   pt( 0.0, 2.7, 0.0 ),
                   pt( -0.2, 2.55, 0.0 ) ),
	    array( pt( 0.0, 3, -0.01 ),
                   pt( -0.8, 3, -0.45 ),
                   pt( 0.0, 2.7, 0.0 ),
                   pt( -0.2, 2.55, -0.112 ) ),
	    array( pt( -0.01, 3, 0.0 ),
                   pt( -0.45, 3, -0.8 ),
                   pt( 0.0, 2.7, 0.0 ),
                   pt( -0.112, 2.55, -0.2 ) ),
	    array( pt( 0.0, 3, -0.01 ),
                   pt( 0.0, 3, -0.8 ),
                   pt( 0.0, 2.7, 0.0 ),
                   pt( 0.0, 2.55, -0.2 ) ) ) ),
    surface( 4, "ec_open", "kv_bezier", 4, "ec_open", "kv_bezier",
	array(
	    array( pt( 0.0, 3, -0.01 ),
                   pt( 0.0, 3, -0.8 ),
                   pt( 0.0, 2.7, 0.0 ),
                   pt( 0.0, 2.55, -0.2 ) ),
	    array( pt( 0.01, 3, 0.0 ),
                   pt( 0.45, 3, -0.8 ),
                   pt( 0.0, 2.7, 0.0 ),
                   pt( 0.112, 2.55, -0.2 ) ),
	    array( pt( 0.0, 3, -0.01 ),
                   pt( 0.8, 3, -0.45 ),
                   pt( 0.0, 2.7, 0.0 ),
                   pt( 0.2, 2.55, -0.112 ) ),
	    array( pt( 0.01, 3, 0.0 ),
                   pt( 0.8, 3, 0.0 ),
                   pt( 0.0, 2.7, 0.0 ),
                   pt( 0.2, 2.55, 0.0 ) ) ) ),
    surface( 4, "ec_open", "kv_bezier", 4, "ec_open", "kv_bezier",
	array(
	    array( pt( 0.2, 2.55, 0.0 ),
                   pt( 0.4, 2.4, 0.0 ),
                   pt( 1.3, 2.4, 0.0 ),
                   pt( 1.3, 2.25, 0.0 ) ),
	    array( pt( 0.2, 2.55, 0.112 ),
                   pt( 0.4, 2.4, 0.224 ),
                   pt( 1.3, 2.4, 0.728 ),
                   pt( 1.3, 2.25, 0.728 ) ),
	    array( pt( 0.112, 2.55, 0.2 ),
                   pt( 0.224, 2.4, 0.4 ),
                   pt( 0.728, 2.4, 1.3 ),
                   pt( 0.728, 2.25, 1.3 ) ),
	    array( pt( 0.0, 2.55, 0.2 ),
                   pt( 0.0, 2.4, 0.4 ),
                   pt( 0.0, 2.4, 1.3 ),
                   pt( 0.0, 2.25, 1.3 ) ) ) ),
    surface( 4, "ec_open", "kv_bezier", 4, "ec_open", "kv_bezier",
	array(
	    array( pt( 0.0, 2.55, 0.2 ),
                   pt( 0.0, 2.4, 0.4 ),
                   pt( 0.0, 2.4, 1.3 ),
                   pt( 0.0, 2.25, 1.3 ) ),
	    array( pt( -0.112, 2.55, 0.2 ),
                   pt( -0.224, 2.4, 0.4 ),
                   pt( -0.728, 2.4, 1.3 ),
                   pt( -0.728, 2.25, 1.3 ) ),
	    array( pt( -0.2, 2.55, 0.112 ),
                   pt( -0.4, 2.4, 0.224 ),
                   pt( -1.3, 2.4, 0.728 ),
                   pt( -1.3, 2.25, 0.728 ) ),
	    array( pt( -0.2, 2.55, 0.0 ),
                   pt( -0.4, 2.4, 0.0 ),
                   pt( -1.3, 2.4, 0.0 ),
                   pt( -1.3, 2.25, 0.0 ) ) ) ),
    surface( 4, "ec_open", "kv_bezier", 4, "ec_open", "kv_bezier",
	array(
	    array( pt( -0.2, 2.55, 0.0 ),
                   pt( -0.4, 2.4, 0.0 ),
                   pt( -1.3, 2.4, 0.0 ),
                   pt( -1.3, 2.25, 0.0 ) ),
	    array( pt( -0.2, 2.55, -0.112 ),
                   pt( -0.4, 2.4, -0.224 ),
                   pt( -1.3, 2.4, -0.728 ),
                   pt( -1.3, 2.25, -0.728 ) ),
	    array( pt( -0.112, 2.55, -0.2 ),
                   pt( -0.224, 2.4, -0.4 ),
                   pt( -0.728, 2.4, -1.3 ),
                   pt( -0.728, 2.25, -1.3 ) ),
	    array( pt( 0.0, 2.55, -0.2 ),
                   pt( 0.0, 2.4, -0.4 ),
                   pt( 0.0, 2.4, -1.3 ),
                   pt( 0.0, 2.25, -1.3 ) ) ) ),
    surface( 4, "ec_open", "kv_bezier", 4, "ec_open", "kv_bezier",
	array(
	    array( pt( 0.0, 2.55, -0.2 ),
                   pt( 0.0, 2.4, -0.4 ),
                   pt( 0.0, 2.4, -1.3 ),
                   pt( 0.0, 2.25, -1.3 ) ),
	    array( pt( 0.112, 2.55, -0.2 ),
                   pt( 0.224, 2.4, -0.4 ),
                   pt( 0.728, 2.4, -1.3 ),
                   pt( 0.728, 2.25, -1.3 ) ),
	    array( pt( 0.2, 2.55, -0.112 ),
                   pt( 0.4, 2.4, -0.224 ),
                   pt( 1.3, 2.4, -0.728 ),
                   pt( 1.3, 2.25, -0.728 ) ),
	    array( pt( 0.2, 2.55, 0.0 ),
                   pt( 0.4, 2.4, 0.0 ),
                   pt( 1.3, 2.4, 0.0 ),
                   pt( 1.3, 2.25, 0.0 ) ) ) ) );
"""

if __name__ == "__main__":
    # In a real scenario, you would read this from a file:
    # with open('teapot.txt', 'r') as f:
    #     teapot_raw_data = f.read()

    parsed_data = parse_teapot_data(teapot_raw_data)

    # Save the parsed data to a JSON file
    with open('teapot_data.json', 'w') as f:
        json.dump(parsed_data, f, indent=4)

    print("Teapot data parsed and saved to 'teapot_data.json'")
