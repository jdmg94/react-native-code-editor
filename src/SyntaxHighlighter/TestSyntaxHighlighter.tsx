import React, { CSSProperties } from 'react';
// @ts-ignore
import * as HLJSSyntaxStyles from 'react-syntax-highlighter/dist/esm/styles/hljs';
// @ts-ignore
// import * as PrismSyntaxStyles from 'react-syntax-highlighter/dist/esm/styles/prism';
// @ts-ignore
import { createStyleObject } from 'react-syntax-highlighter/dist/esm/create-element';
import { ScrollView, View, Text, Platform, ColorValue, TextStyle } from 'react-native';
import SyntaxHighlighterHLJS, {
  SyntaxHighlighterProps as HighlighterProps,
} from 'react-syntax-highlighter';
// @ts-ignore
import SyntaxHighlighterPrism from 'react-syntax-highlighter/dist/esm/prism';

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

export type SyntaxHighlighterStyleType = {
  /**
   * Default is Menlo-Regular (iOS) and Monospace (Android).
   */
  fontFamily?: string;

  /**
   * Default is 16.
   */
  fontSize?: number;

  /**
   * Override the syntax style background.
   */
  backgroundColor?: ColorValue;

  /**
   * Default is 16.
   */
  padding?: number;

  /**
   * Text color of the line numbers.
   */
  lineNumbersColor?: ColorValue;

  /**
   * Background color of the line numbers.
   */
  lineNumbersBackgroundColor?: ColorValue;

  /**
   * Use this property to align the syntax highlighter text with the text input.
   */
  highlighterLineHeight?: number;

  /**
   * Use this property to align the syntax highlighter text with the text input.
   */
  inputLineHeight?: number;

  /**
   * Use this property to help you align the syntax highlighter text with the text input.
   * Do not use in production.
   */
  highlighterColor?: ColorValue;
};

export const SyntaxHighlighterSyntaxStyles = HLJSSyntaxStyles;

export type SyntaxHighlighterProps = HighlighterProps & {
  /**
   * Code to display.
   */
  children: string;

  /**
   * Syntax highlighting style.
   * @See https://github.com/react-syntax-highlighter/react-syntax-highlighter/blob/master/AVAILABLE_STYLES_HLJS.MD
   */
  syntaxStyle: typeof SyntaxHighlighterSyntaxStyles;

  /**
   * Extra styling options for the syntax highlighter.
   */
  addedStyle?: SyntaxHighlighterStyleType;

  /**
   * Whether to allow scrolling on the syntax highlighter.
   */
  scrollEnabled?: boolean;

  /**
   * Test ID used for testing.
   */
  testID?: string;
  /**
   *  which highlighter to use
   */
  highlighter: 'highlightjs' | 'prism';
};

type PropsWithForwardRef = SyntaxHighlighterProps & {
  forwardedRef: React.Ref<any>;
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
  const transformedStyle: Record<string, TextStyle | CSSProperties> = Object.entries(
    stylesheet
  ).reduce((newStylesheet, [className, style]) => {
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
  }, {});
  const topLevel =
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
  line?: number;
  showLineNumbers?: boolean;
};

function createNativeElement({
  node,
  stylesheet,
  key,
  defaultColor,
  fontFamily,
  fontSize = 16,
  line = 0,
  showLineNumbers = false,
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
        {showLineNumbers && (
          <Text
            style={{
              fontFamily,
              padding: 1.75 * fontSize,
              paddingTop: 3,
              textAlign: 'left',
              color: 'rgba(127, 127, 127, 0.9)',
              fontSize: 0.7 * fontSize,
              width: 1.75 * fontSize - 5,
            }}
          >
            {line}
          </Text>
        )}
        {children}
      </Text>
    );
  }
}

type nativeRendererProps = {
  defaultColor: string;
  fontFamily: string;
  fontSize: number;
  forwardedRef: React.Ref<ScrollView>;
  showLineNumbers?: boolean;
};

type innerNativeRenderer = {
  rows: Node[];
  stylesheet: Record<string, React.CSSProperties>;
  useInlineStyles?: boolean;
};

function nativeRenderer({
  defaultColor,
  fontFamily,
  fontSize,
  forwardedRef,
  showLineNumbers = true,
}: nativeRendererProps) {
  return ({ rows, stylesheet }: innerNativeRenderer) => (
    <ScrollView ref={forwardedRef}>
      {rows.map((node, i) =>
        createNativeElement({
          node,
          stylesheet,
          line: i + 1,
          key: `code-segment-${i}`,
          defaultColor,
          fontFamily,
          fontSize,
          showLineNumbers,
        })
      )}
    </ScrollView>
  );
}

const SyntaxHighlighter = (props: PropsWithForwardRef): JSX.Element => {
  const {
    syntaxStyle = {},
    addedStyle,
    highlighter,
    showLineNumbers = false,
    forwardedRef,
    testID,
    ...highlighterProps
  } = props;

  // Default values
  const {
    fontFamily = Platform.OS === 'ios' ? 'Menlo-Regular' : 'monospace',
    fontSize = 16,
    // backgroundColor = undefined,
    // padding = 16,
    // inputLineHeight = 16,
    // lineNumbersColor = 'rgba(127, 127, 127, 0.9)',
    // lineNumbersBackgroundColor = undefined,
    // highlighterColor = '#FFF',
  } = addedStyle || {};

  // Only when line numbers are showing
  // const lineNumbersPadding = showLineNumbers ? 1.75 * fontSize : undefined;
  // const lineNumbersFontSize = 0.7 * fontSize;

  // Prevents the last line from clipping when scrolling
  highlighterProps.children += '\n';

  // type TextNodeProps = {
  //   node: Node;
  //   index: number;
  //   totalItems?: number;
  //   id: string | number;
  // };

  // const _nativeRenderer = useCallback(
  //   ({ rows }: RendererParams) => {
  //     const TextPortion = ({ node, id, index }: TextNodeProps) => {
  //       if (node.type === 'text') {
  //         return <Text>{node.value}</Text>;
  //       }

  //       const key = `${id}.${index}`;

  //       return (
  //         <Text
  //           textBreakStrategy="highQuality"
  //           style={[
  //             {
  //               color: highlighterColor || syntaxStylesheet.hljs?.color,
  //             },
  //             ...(node.properties?.className || []).map((c) => syntaxStylesheet[c]),
  //             {
  //               fontFamily,
  //               fontSize,
  //               lineHeight: inputLineHeight,
  //             },
  //           ]}
  //         >
  //           {node.children?.map((segment, idx) => (
  //             <TextPortion
  //               key={`${key}.${idx}`}
  //               index={idx}
  //               node={segment}
  //               id={`${key}.${node.tagName}}`}
  //             />
  //           ))}
  //         </Text>
  //       );
  //     };
  //     const TextNode = memo(
  //       ({ index, node, totalItems, id }: TextNodeProps) => {
  //         return (
  //           <View
  //             style={{
  //               margin: 0,
  //               paddingLeft: 5,
  //               flexDirection: 'row',
  //               height: inputLineHeight,
  //             }}
  //           >
  //             {showLineNumbers && (
  //               <Text
  //                 style={{
  //                   fontFamily,
  //                   paddingTop: 3,
  //                   textAlign: 'center',
  //                   color: lineNumbersColor,
  //                   fontSize: lineNumbersFontSize,
  //                   backgroundColor: lineNumbersBackgroundColor,
  //                   width: lineNumbersPadding ? lineNumbersPadding - 5 : 0,
  //                 }}
  //               >
  //                 {index}
  //               </Text>
  //             )}
  //             <TextPortion id={id} node={node} index={index} totalItems={totalItems} />
  //           </View>
  //         );
  //       },
  //       (prevState, nextState) =>
  //         prevState.node.value !== nextState.node.value ||
  //         prevState.node.type !== nextState.node.type ||
  //         // @ts-ignore
  //         prevState.children?.length !== nextState.children?.length
  //     );

  //     return (
  //       <FlatList<Node>
  //         data={rows}
  //         windowSize={40}
  //         // ref={forwardedRef}
  //         initialScrollIndex={0}
  //         initialNumToRender={30}
  //         scrollEnabled={scrollEnabled}
  //         testID={`${testID}-scroll-view`}
  //         contentContainerStyle={[
  //           syntaxStylesheet.hljs,
  //           {
  //             padding: 0,
  //             paddingTop: 6.5,
  //             paddingBottom: padding,
  //           },
  //         ]}
  //         style={{
  //           margin: 0,
  //           padding: 0,
  //           width: '100%',
  //           height: '100%',
  //           backgroundColor: backgroundColor || syntaxStylesheet.hljs?.background,
  //         }}
  //         renderItem={({ item, index }) => (
  //           <TextNode
  //             node={item}
  //             index={index}
  //             id={`code-line-${index}`}
  //             totalItems={rows.length}
  //           />
  //         )}
  //       />
  //     );
  //   },
  //   [
  //     backgroundColor,
  //     padding,
  //     scrollEnabled,
  //     testID,
  //     fontFamily,
  //     fontSize,
  //     highlighterColor,
  //     inputLineHeight,
  //     lineNumbersBackgroundColor,
  //     lineNumbersColor,
  //     lineNumbersFontSize,
  //     lineNumbersPadding,
  //     showLineNumbers,
  //     syntaxStylesheet,
  //   ]
  // );

  const { transformedStyle, defaultColor } = generateNewStylesheet({
    stylesheet: syntaxStyle,
    highlighter,
  });
  const Highlighter = highlighter === 'prism' ? SyntaxHighlighterPrism : SyntaxHighlighterHLJS;

  return (
    <Highlighter
      {...highlighterProps}
      customStyle={{
        padding: 0,
      }}
      style={transformedStyle}
      horizontal={true}
      useInlineStyles
      CodeTag={View}
      PreTag={View}
      renderer={nativeRenderer({
        showLineNumbers,
        fontFamily,
        fontSize,
        defaultColor,
        forwardedRef,
      })}
      testID={testID}
    />
  );
};

const SyntaxHighlighterWithForwardRef = React.forwardRef<ScrollView, SyntaxHighlighterProps>(
  (props, ref) => <SyntaxHighlighter {...props} forwardedRef={ref} />
);

export default SyntaxHighlighterWithForwardRef;
