precision mediump float;

uniform vec2 iResolution;
uniform float iTime;
uniform float uInvert;

#define DOTS 300.0
#define MIN_BRIGHTNESS 0.05
#define MAX_BRIGHTNESS 0.7

void mainImage(out vec4 fragColor, in vec2 fragCoord)
{
    float gridSize = iResolution.x / DOTS;

    vec2 cell = floor(fragCoord / gridSize);
    vec2 cellUV = fract(fragCoord / gridSize) - 0.5;

    vec2 sampleCoord = (cell + 0.5) * gridSize;

    vec2 uv = (2.0 * sampleCoord - iResolution.xy) /
              min(iResolution.x, iResolution.y);

    for (float i = 1.0; i < 8.0; i++)
    {
        uv.y += 0.1 *
            sin(uv.x * i * i + iTime * 0.5) *
            sin(uv.y * i * i + iTime * 0.5);
    }

    float rawBrightness = uv.y * 0.5 + 0.5;
    rawBrightness = clamp(rawBrightness, 0.0, 1.0);
    float brightness = MIN_BRIGHTNESS + rawBrightness * (MAX_BRIGHTNESS - MIN_BRIGHTNESS);

    float dist = length(cellUV);
    float radius = brightness * 0.45;

    float dot = 1.0 - smoothstep(
        radius - 0.02,
        radius + 0.02,
        dist
    );

    dot *= brightness;

    // Light mode: smooth 0..1 invert of the dot pattern using the same min/max curve
    dot = mix(dot, 1.0 - dot, uInvert);

    fragColor = vec4(vec3(dot), 1.0);
}

void main()
{
    vec4 color;
    // 180-degree rotation in post without touching mainImage
    vec2 rotatedCoord = iResolution.xy - gl_FragCoord.xy;
    mainImage(color, rotatedCoord);
    gl_FragColor = color;
}
