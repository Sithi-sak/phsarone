import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { ThemedText } from "@src/components/shared_components/ThemedText";
import useThemeColor from "@src/hooks/useThemeColor";

interface Segment {
  color: string;
  label: string;
  value: number;
}

interface InterestsDonutChartProps {
  segments: Segment[];
}

function polarToCartesian(
  cx: number,
  cy: number,
  radius: number,
  angleInDegrees: number,
) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(angleInRadians),
    y: cy + radius * Math.sin(angleInRadians),
  };
}

function describeArc(
  cx: number,
  cy: number,
  radius: number,
  startAngle: number,
  endAngle: number,
) {
  const start = polarToCartesian(cx, cy, radius, endAngle);
  const end = polarToCartesian(cx, cy, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

  return [
    "M",
    start.x,
    start.y,
    "A",
    radius,
    radius,
    0,
    largeArcFlag,
    0,
    end.x,
    end.y,
  ].join(" ");
}

export default function InterestsDonutChart({
  segments,
}: InterestsDonutChartProps) {
  const themeColors = useThemeColor();

  const arcs = useMemo(() => {
    const gap = 4;
    let currentStart = 0;

    return segments.map((segment) => {
      const span = (segment.value / 100) * 360;
      const start = currentStart + gap / 2;
      const end = currentStart + span - gap / 2;
      currentStart += span;

      return {
        ...segment,
        path: describeArc(70, 70, 38, start, end),
      };
    });
  }, [segments]);

  return (
    <View style={styles.wrap}>
      <Svg width={140} height={140}>
        <Circle cx={70} cy={70} r={38} stroke={themeColors.border} strokeWidth={18} fill="none" />
        {arcs.map((arc) => (
          <Path
            key={arc.label}
            d={arc.path}
            stroke={arc.color}
            strokeWidth={18}
            strokeLinecap="round"
            fill="none"
          />
        ))}
      </Svg>

      <View style={styles.legend}>
        {segments.map((segment) => (
          <View key={segment.label} style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: segment.color }]} />
            <ThemedText style={styles.legendText}>
              {segment.label}  {segment.value}%
            </ThemedText>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  legend: {
    flex: 1,
    marginLeft: 18,
  },
  legendRow: {
    alignItems: "center",
    flexDirection: "row",
    marginBottom: 8,
  },
  legendDot: {
    borderRadius: 5,
    height: 10,
    marginRight: 8,
    width: 10,
  },
  legendText: {
    fontSize: 14,
    opacity: 0.9,
  },
});