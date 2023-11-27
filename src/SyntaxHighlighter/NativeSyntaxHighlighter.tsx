// @ts-ignore
global.Prism = { disableWorkerMessageHandler: true };

import React, { CSSProperties } from 'react';
import { Text, ScrollView, Platform } from 'react-native';
import SyntaxHighlighter, { SyntaxHighlighterProps } from 'react-syntax-highlighter';
// @ts-ignore
import SyntaxHighlighterPrism from 'react-syntax-highlighter/dist/esm/prism';
// @ts-ignore
import { createStyleObject } from 'react-syntax-highlighter/dist/esm/create-element';
// @ts-ignore
import { defaultStyle } from 'react-syntax-highlighter/dist/esm/styles/hljs';
// @ts-ignore
import { prism as prismDefaultStyle } from 'react-syntax-highlighter/dist/esm/styles/prism';

const styleCache = new Map();

const topLevelPropertiesToRemove = [
  'color',
  'textShadow',
  'textAlign',
  'whiteSpace',
  'wordSpacing',
  'wordBreak',
  'wordWrap',
  'lineHeight',
  'MozTabSize',
  'OTabSize',
  'tabSize',
  'WebkitHyphens',
  'MozHyphens',
  'msHyphens',
  'hyphens',
  'fontFamily',
];

export type Node = {
  type: 'element' | 'text';
  value?: string | number | undefined;
  tagName?: keyof JSX.IntrinsicElements | React.ComponentType<any> | undefined;
  properties?: { className: any[]; [key: string]: any };
  children?: Node[];
};

type generateNewStylesheetProps = {
  stylesheet: Record<string, CSSProperties>;
  highlighter: 'prism' | 'highlightjs';
};

function generateNewStylesheet({ stylesheet, highlighter }: generateNewStylesheetProps) {
  if (styleCache.has(stylesheet)) {
    return styleCache.get(stylesheet);
  }
  // I don't know why, but sometimes 'stylesheet' comes as an Array
  // like this [{ stylesheet }, { opacity: 0.85 }], instead of an Object,
  // so this throws an error referenced at issue #17
  // So, this is a workaround, if the  stylesheet is an Array,
  // returns the first element, wich is the actual style object.
  stylesheet = Array.isArray(stylesheet) ? stylesheet[0] : stylesheet;
  const transformedStyle: Record<string, CSSProperties> = Object.entries(stylesheet).reduce(
    (newStylesheet, [className, style]) => {
      // @ts-ignore
      newStylesheet[className] = Object.entries(style).reduce(
        (newStyle: CSSProperties, [key, value]) => {
          if (key === 'overflowX' || key === 'overflow') {
            newStyle.overflow = value === 'auto' ? 'scroll' : value;
          } else if (value.includes('em')) {
            const [num] = value.split('em');
            // @ts-ignore
            newStyle[key] = Number(num) * 16;
          } else if (key === 'background') {
            newStyle.backgroundColor = value;
          } else if (key === 'display') {
            return newStyle;
          } else {
            // @ts-ignore
            newStyle[key] = value;
          }
          return newStyle;
        },
        {}
      );
      return newStylesheet;
    },
    {}
  );
  const topLevel: CSSProperties =
    highlighter === 'prism' ? transformedStyle['pre[class*="language-"]'] : transformedStyle.hljs;
  const defaultColor = (topLevel && topLevel.color) || '#000';
  topLevelPropertiesToRemove.forEach((property) => {
    // @ts-ignore
    if (topLevel[property]) {
      // @ts-ignore
      delete topLevel[property];
    }
  });
  if (topLevel.backgroundColor === 'none') {
    delete topLevel.backgroundColor;
  }
  const codeLevel = transformedStyle['code[class*="language-"]'];
  if (highlighter === 'prism' && !!codeLevel) {
    topLevelPropertiesToRemove.forEach((property) => {
      // @ts-ignore
      if (codeLevel[property]) {
        // @ts-ignore
        delete codeLevel[property];
      }
    });
    if (codeLevel.backgroundColor === 'none') {
      delete codeLevel.backgroundColor;
    }
  }
  styleCache.set(stylesheet, { transformedStyle, defaultColor });
  return { transformedStyle, defaultColor };
}

type createChildrenProps = {
  stylesheet: Record<string, CSSProperties>;
  fontSize: number;
  fontFamily: string;
};

function createChildren({ stylesheet, fontSize, fontFamily }: createChildrenProps) {
  let childrenCount = 0;
  return (children: Node[], defaultColor: string) => {
    childrenCount += 1;
    return children.map((child, i: number) =>
      createNativeElement({
        node: child,
        stylesheet,
        key: `code-segment-${childrenCount}-${i}`,
        defaultColor,
        fontSize,
        fontFamily,
      })
    );
  };
}

type createNativeElementProps = {
  node: Node;
  stylesheet: Record<string, CSSProperties>;
  key: string;
  defaultColor: string;
  fontFamily: string;
  fontSize?: number;
};

function createNativeElement({
  node,
  stylesheet,
  key,
  defaultColor,
  fontFamily,
  fontSize = 16,
}: createNativeElementProps) {
  const { properties = { className: [] }, type, tagName: TagName, value } = node;
  const startingStyle = { fontFamily, fontSize, height: fontSize + 5 };
  if (type === 'text') {
    return (
      <Text key={key} style={Object.assign({ color: defaultColor }, startingStyle)}>
        {value}
      </Text>
    );
  } else if (TagName) {
    const childrenCreator = createChildren({ stylesheet, fontSize, fontFamily });
    const style = createStyleObject(
      properties.className,
      Object.assign({ color: defaultColor }, properties.style, startingStyle),
      stylesheet
    );
    const children = childrenCreator(node.children || [], style.color || defaultColor);
    return (
      <Text key={key} style={style}>
        {children}
      </Text>
    );
  }
}

type nativeRendererProps = {
  defaultColor: string;
  fontFamily: string;
  fontSize: number;
};

type innerNativeRenderer = {
  rows: Node[];
  stylesheet: Record<string, CSSProperties>;
};

function nativeRenderer({ defaultColor, fontFamily, fontSize }: nativeRendererProps) {
  return ({ rows, stylesheet }: innerNativeRenderer) =>
    rows.map((node, i) =>
      createNativeElement({
        node,
        stylesheet,
        key: `code-segment-${i}`,
        defaultColor,
        fontFamily,
        fontSize,
      })
    );
}

type NativeSyntaxHighlighterProps = SyntaxHighlighterProps & {
  fontFamily?: string;
  fontSize: number;
  children: string;
  highlighter: 'highlightjs' | 'prism';
  style?: Record<string, CSSProperties>;
};

function NativeSyntaxHighlighter({
  fontFamily = Platform.OS === 'ios' ? 'Menlo-Regular' : 'monospace',
  fontSize,
  children,
  highlighter = 'highlightjs',
  style = highlighter === 'prism' ? prismDefaultStyle : defaultStyle,
  ...rest
}: NativeSyntaxHighlighterProps) {
  const { transformedStyle, defaultColor } = generateNewStylesheet({
    stylesheet: style,
    highlighter,
  });
  const Highlighter = highlighter === 'prism' ? SyntaxHighlighterPrism : SyntaxHighlighter;
  return (
    <Highlighter
      {...rest}
      style={transformedStyle}
      horizontal={true}
      renderer={nativeRenderer({
        defaultColor,
        fontFamily,
        fontSize,
      })}
    >
      {children}
    </Highlighter>
  );
}

NativeSyntaxHighlighter.defaultProps = {
  fontSize: 16,
  PreTag: ScrollView,
  CodeTag: ScrollView,
};

export default NativeSyntaxHighlighter;
