import * as PhosphorIcons from "phosphor-react-native";
import { IconProps } from "phosphor-react-native";
import React from "react";
/* eslint-disable import/namespace */

interface DynamicPhosphorIconProps extends IconProps {
  name: string;
}

const DynamicPhosphorIcon: React.FC<DynamicPhosphorIconProps> = ({
  name,
  ...rest
}) => {
  const IconComponent = PhosphorIcons[
    name as keyof typeof PhosphorIcons
  ] as React.ComponentType<IconProps>;

  if (!IconComponent) {
    console.warn(`Phosphor Icon "${name}" not found.`);
    return null;
  }

  return <IconComponent {...rest} />;
};

export default DynamicPhosphorIcon;
