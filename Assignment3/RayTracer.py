import sys
import numpy as np

class Vector:
    def __init__(self, x=0, y=0, z=0):
        self.x = float(x)
        self.y = float(y)
        self.z = float(z)
    
    def dot(self, other):
        return self.x * other.x + self.y * other.y + self.z * other.z
    
    def normalize(self):
        length = self.length()
        if length > 0:
            return Vector(self.x / length, self.y / length, self.z / length)
        return Vector(0, 0, 0)
    
    def length(self):
        return np.sqrt(self.x**2 + self.y**2 + self.z**2)
    
    def reflect(self, normal):
        n_dot_i = self.dot(normal)
        return Vector(
            self.x - 2 * n_dot_i * normal.x,
            self.y - 2 * n_dot_i * normal.y,
            self.z - 2 * n_dot_i * normal.z
        )
    
    def __add__(self, other):
        return Vector(self.x + other.x, self.y + other.y, self.z + other.z)
    
    def __sub__(self, other):
        return Vector(self.x - other.x, self.y - other.y, self.z - other.z)
    
    def __mul__(self, scalar):
        return Vector(self.x * scalar, self.y * scalar, self.z * scalar)
    
    def __str__(self):
        return f"({self.x}, {self.y}, {self.z})"

class Color:
    def __init__(self, r=0, g=0, b=0):
        self.r = float(r)
        self.g = float(g)
        self.b = float(b)
    
    def __add__(self, other):
        return Color(self.r + other.r, self.g + other.g, self.b + other.b)
    
    def __mul__(self, scalar):
        return Color(self.r * scalar, self.g * scalar, self.b * scalar)
    
    def multiply(self, other):
        return Color(self.r * other.r, self.g * other.g, self.b * other.b)
    
    def clamp(self):
        return Color(
            min(1.0, max(0.0, self.r)),
            min(1.0, max(0.0, self.g)),
            min(1.0, max(0.0, self.b))
        )
    
    def to_rgb_bytes(self):
        return (int(self.r * 255), int(self.g * 255), int(self.b * 255))

class Ray:
    def __init__(self, origin, direction):
        self.origin = origin
        self.direction = direction.normalize()
    
    def point_at(self, t):
        return Vector(
            self.origin.x + t * self.direction.x,
            self.origin.y + t * self.direction.y,
            self.origin.z + t * self.direction.z
        )

class Sphere:
    def __init__(self, name, pos_x, pos_y, pos_z, scale_x, scale_y, scale_z, 
                 r, g, b, ka, kd, ks, kr, n):
        self.name = name
        self.position = Vector(pos_x, pos_y, pos_z)
        self.scale = Vector(scale_x, scale_y, scale_z)
        self.inv_scale = Vector(1.0/scale_x, 1.0/scale_y, 1.0/scale_z) if scale_x and scale_y and scale_z else Vector(1, 1, 1)
        self.color = Color(r, g, b)
        self.ka = float(ka)
        self.kd = float(kd)
        self.ks = float(ks)
        self.kr = float(kr)
        self.n = int(n)
    
    def intersect(self, ray):
        # Transform ray to object space (applying inverse scale)
        ray_origin_to_center = ray.origin - self.position
        
        scaled_origin = Vector(
            ray_origin_to_center.x * self.inv_scale.x,
            ray_origin_to_center.y * self.inv_scale.y,
            ray_origin_to_center.z * self.inv_scale.z
        )
        
        scaled_direction = Vector(
            ray.direction.x * self.inv_scale.x,
            ray.direction.y * self.inv_scale.y,
            ray.direction.z * self.inv_scale.z
        )
        scaled_direction_length = scaled_direction.length()
        normalized_scaled_direction = scaled_direction.normalize()
        
        # Calculate quadratic equation coefficients
        a = normalized_scaled_direction.dot(normalized_scaled_direction)
        b = 2.0 * scaled_origin.dot(normalized_scaled_direction)
        c = scaled_origin.dot(scaled_origin) - 1.0  # Unit sphere radius is 1
        
        # Calculate discriminant
        discriminant = b * b - 4 * a * c
        
        if discriminant < 0:
            return None
            
        # Calculate intersection time
        sqrtd = np.sqrt(discriminant)
        t1 = (-b - sqrtd) / (2.0 * a)
        t2 = (-b + sqrtd) / (2.0 * a)
        
        # Find the nearest intersection point that is not behind the ray origin
        t = t1 if t1 > 0.001 else (t2 if t2 > 0.001 else -1)
        
        if t <= 0:
            return None
        
        # Adjust t for scaling
        t = t / scaled_direction_length
        
        # Calculate intersection point in world space
        hit_point = ray.point_at(t)
        
        # Calculate the normal in object space
        obj_hit_point = Vector(
            (hit_point.x - self.position.x) * self.inv_scale.x,
            (hit_point.y - self.position.y) * self.inv_scale.y,
            (hit_point.z - self.position.z) * self.inv_scale.z
        )
        
        # For a unit sphere, the normal is the same as the position
        obj_normal = obj_hit_point.normalize()
        
        # Transform normal back to world space (using transpose of inverse of scaling matrix)
        # For scaling matrix, transpose of inverse is 1/scale
        world_normal = Vector(
            obj_normal.x / self.scale.x,
            obj_normal.y / self.scale.y,
            obj_normal.z / self.scale.z
        ).normalize()
        
        return {
            "t": t,
            "hit_point": hit_point,
            "normal": world_normal
        }

class Light:
    def __init__(self, name, pos_x, pos_y, pos_z, ir, ig, ib):
        self.name = name
        self.position = Vector(pos_x, pos_y, pos_z)
        self.intensity = Color(ir, ig, ib)

class Scene:
    def __init__(self):
        self.near = 0
        self.left = 0
        self.right = 0
        self.bottom = 0
        self.top = 0
        self.resolution = (0, 0)
        self.spheres = []
        self.lights = []
        self.background = Color(0, 0, 0)
        self.ambient = Color(0, 0, 0)
        self.output_file = ""
    
    def parse_file(self, filename):
        with open(filename, 'r') as file:
            for line in file:
                tokens = line.strip().split()
                if not tokens:
                    continue
                
                if tokens[0] == "NEAR":
                    self.near = float(tokens[1])
                elif tokens[0] == "LEFT":
                    self.left = float(tokens[1])
                elif tokens[0] == "RIGHT":
                    self.right = float(tokens[1])
                elif tokens[0] == "BOTTOM":
                    self.bottom = float(tokens[1])
                elif tokens[0] == "TOP":
                    self.top = float(tokens[1])
                elif tokens[0] == "RES":
                    self.resolution = (int(tokens[1]), int(tokens[2]))
                elif tokens[0] == "SPHERE":
                    self.spheres.append(Sphere(
                        tokens[1], 
                        float(tokens[2]), float(tokens[3]), float(tokens[4]),
                        float(tokens[5]), float(tokens[6]), float(tokens[7]),
                        float(tokens[8]), float(tokens[9]), float(tokens[10]),
                        float(tokens[11]), float(tokens[12]), float(tokens[13]),
                        float(tokens[14]), int(tokens[15])
                    ))
                elif tokens[0] == "LIGHT":
                    self.lights.append(Light(
                        tokens[1],
                        float(tokens[2]), float(tokens[3]), float(tokens[4]),
                        float(tokens[5]), float(tokens[6]), float(tokens[7])
                    ))
                elif tokens[0] == "BACK":
                    self.background = Color(float(tokens[1]), float(tokens[2]), float(tokens[3]))
                elif tokens[0] == "AMBIENT":
                    self.ambient = Color(float(tokens[1]), float(tokens[2]), float(tokens[3]))
                elif tokens[0] == "OUTPUT":
                    self.output_file = tokens[1]
    
    def find_closest_intersection(self, ray, exclude_sphere=None):
        t_min = float('inf')
        closest_hit = None
        closest_sphere = None
        
        for sphere in self.spheres:
            if sphere == exclude_sphere:
                continue
                
            hit = sphere.intersect(ray)
            if hit and hit["t"] < t_min:
                t_min = hit["t"]
                closest_hit = hit
                closest_sphere = sphere
        
        return closest_sphere, closest_hit
    
    def shade(self, ray, sphere, hit, depth):
        # Calculate ambient component
        ambient = sphere.color.multiply(self.ambient) * sphere.ka
        
        # Start with ambient component
        result_color = ambient
        
        # Get eye vector (opposite of ray direction)
        eye_vector = ray.direction * -1
        
        # Add light contributions
        for light in self.lights:
            # Calculate light vector
            light_vector = light.position - hit["hit_point"]
            light_distance = light_vector.length()
            light_dir = light_vector.normalize()
            
            # Check for shadows
            shadow_origin = hit["hit_point"] + hit["normal"] * 0.001
            shadow_ray = Ray(shadow_origin, light_dir)
            
            shadow_sphere, shadow_hit = self.find_closest_intersection(shadow_ray)
            
            # If point is in shadow, skip this light's contribution
            if shadow_sphere and shadow_hit["t"] < light_distance:
                continue
            
            # Calculate diffuse component (Lambert's law)
            n_dot_l = max(0, hit["normal"].dot(light_dir))
            diffuse = sphere.color.multiply(light.intensity) * (sphere.kd * n_dot_l)
            
            # Calculate specular component (Phong model)
            # Use the reflection formula: R = 2(N·L)N - L
            reflect_dir = hit["normal"] * (2 * n_dot_l) - light_dir
            reflect_dir = reflect_dir.normalize()
            r_dot_v = max(0, reflect_dir.dot(eye_vector))
            specular = light.intensity * (sphere.ks * (r_dot_v ** sphere.n))
            
            # Add this light's contribution
            result_color = result_color + diffuse + specular
        
        # Add reflection component if needed
        if depth < 3 and sphere.kr > 0:
            # Calculate reflection ray
            reflect_dir = ray.direction.reflect(hit["normal"])
            reflect_origin = hit["hit_point"] + hit["normal"] * 0.001
            reflect_ray = Ray(reflect_origin, reflect_dir)
            
            # Trace reflection ray
            reflection_color = self.trace_ray(reflect_ray, depth + 1, sphere)
            
            # Add reflection contribution
            result_color = result_color + reflection_color * sphere.kr
        
        return result_color.clamp()
    
    def trace_ray(self, ray, depth=0, exclude_sphere=None):
        # Find closest intersection
        closest_sphere, closest_hit = self.find_closest_intersection(ray, exclude_sphere)
        
        # If no intersection, return background or black depending on depth
        if not closest_hit:
            return self.background if depth == 0 else Color(0, 0, 0)
        
        # Calculate color at intersection point
        return self.shade(ray, closest_sphere, closest_hit, depth)
    
    def render(self):
        width, height = self.resolution
        image = [[(0, 0, 0) for _ in range(width)] for _ in range(height)]
        
        # Eye at origin
        eye_position = Vector(0, 0, 0)
        
        for j in range(height):
            if j % 50 == 0:
                print(f"Rendering row {j}/{height}...")
                
            for i in range(width):
                # Calculate normalized device coordinates
                u = self.left + (self.right - self.left) * (i + 0.5) / width
                v = self.bottom + (self.top - self.bottom) * (j + 0.5) / height
                
                # Create primary ray
                ray_dir = Vector(u, v, -self.near).normalize()
                ray = Ray(eye_position, ray_dir)
                
                # Trace ray
                color = self.trace_ray(ray)
                
                # Store pixel color (flipped vertically for PPM)
                image[height - j - 1][i] = color.to_rgb_bytes()
        
        return image
    
    def save_ppm(self, image):
        width, height = self.resolution
        
        with open(self.output_file, 'w') as file:
            # PPM header
            file.write(f"P3\n")
            file.write(f"{width} {height}\n")
            file.write(f"255\n")
            
            # Pixel data
            for row in image:
                for r, g, b in row:
                    file.write(f"{r} {g} {b} ")
                file.write("\n")

def main():
    if len(sys.argv) != 2:
        print("Usage: python RayTracer.py <input_file>")
        sys.exit(1)
    
    input_file = sys.argv[1]
    
    scene = Scene()
    scene.parse_file(input_file)
    
    print(f"Ray tracing image of size {scene.resolution[0]}x{scene.resolution[1]}")
    print(f"Scene contains {len(scene.spheres)} spheres and {len(scene.lights)} lights")
    
    image = scene.render()
    scene.save_ppm(image)
    
    print(f"Rendering complete. Image saved to {scene.output_file}")

if __name__ == "__main__":
    main()