import React, { useCallback } from 'react';
// @ts-ignore
import * as HLJSSyntaxStyles from 'react-syntax-highlighter/dist/esm/styles/hljs';
import { FlatList, View, Text, Platform, ColorValue, TextStyle } from 'react-native';
import Highlighter, { SyntaxHighlighterProps as HighlighterProps } from 'react-syntax-highlighter';

export type Node = {
  type: 'element' | 'text';
  value?: string | number | undefined;
  tagName?: keyof JSX.IntrinsicElements | React.ComponentType<any> | undefined;
  properties?: { className: any[]; [key: string]: any };
  children?: Node[];
};

type StyleSheet = {
  [key: string]: TextStyle & {
    background?: string;
  };
};

type RendererParams = {
  rows: Node[];
  stylesheet: StyleSheet;
  useInlineStyles?: boolean;
};

type TextNodeProps = {
  node: Node;
  index: number;
  totalItems?: number;
  id: string | number;
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
};

type TextPortionDeps = {
  highlighterColor: string;
  syntaxStylesheet: typeof SyntaxHighlighterSyntaxStyles;
  fontSize: number;
  fontFamily: string;
  inputLineHeight: number;
};

const TextPortion =
  ({
    highlighterColor,
    syntaxStylesheet,
    fontSize,
    fontFamily,
    inputLineHeight,
  }: TextPortionDeps) =>
  ({ node, id, index }: TextNodeProps) => {
    if (node.type === 'text') {
      return <Text>{node.value}</Text>;
    }

    const key = `${id}.${index}`;
    const Segment = TextPortion({
      highlighterColor,
      syntaxStylesheet,
      fontSize,
      fontFamily,
      inputLineHeight,
    });
    return (
      <Text
        textBreakStrategy="highQuality"
        style={[
          {
            color: highlighterColor || syntaxStylesheet.hljs?.color,
          },
          ...(node.properties?.className || []).map((c) => syntaxStylesheet[c]),
          {
            fontFamily,
            fontSize,
            lineHeight: inputLineHeight,
          },
        ]}
      >
        {node.children?.map((segment, idx) => (
          <Segment
            key={`${key}.${idx}`}
            index={idx}
            node={segment}
            id={`${key}.${node.tagName}}`}
          />
        ))}
      </Text>
    );
  };

type PropsWithForwardRef = SyntaxHighlighterProps & {
  forwardedRef: React.Ref<FlatList<Node>>;
};

const SyntaxHighlighter = (props: PropsWithForwardRef): JSX.Element => {
  const {
    syntaxStyle = {},
    addedStyle,
    scrollEnabled,
    showLineNumbers = false,
    forwardedRef,
    testID,
    ...highlighterProps
  } = props;

  // Default values
  const {
    fontFamily = Platform.OS === 'ios' ? 'Menlo-Regular' : 'monospace',
    fontSize = 16,
    backgroundColor = undefined,
    padding = 16,
    inputLineHeight = 16,
    lineNumbersColor = 'rgba(127, 127, 127, 0.9)',
    lineNumbersBackgroundColor = undefined,
    highlighterColor = '#FFF',
  } = addedStyle || {};

  // Only when line numbers are showing
  const lineNumbersPadding = showLineNumbers ? 1.75 * fontSize : undefined;
  const lineNumbersFontSize = 0.7 * fontSize;

  // Prevents the last line from clipping when scrolling
  highlighterProps.children += '\n';

  const cleanStyle = (style: TextStyle) => {
    const clean: TextStyle = {
      ...style,
      display: undefined,
    };
    return clean;
  };

  const syntaxStylesheet: StyleSheet = Object.fromEntries(
    Object.entries(syntaxStyle as StyleSheet).map(([className, style]) => [
      className,
      cleanStyle(style),
    ])
  );
  const nativeRenderer = useCallback(
    () =>
      ({ rows }: RendererParams) => {
        const TextNode = ({ index, node, totalItems, id }: TextNodeProps) => {
          const Segment = TextPortion({
            fontFamily,
            fontSize,
            highlighterColor: highlighterColor as string,
            inputLineHeight,
            syntaxStylesheet,
          });
          return (
            <View
              style={{
                margin: 0,
                paddingLeft: 5,
                flexDirection: 'row',
                height: inputLineHeight,
              }}
            >
              {showLineNumbers && (
                <Text
                  style={{
                    fontFamily,
                    paddingTop: 3,
                    textAlign: 'center',
                    color: lineNumbersColor,
                    fontSize: lineNumbersFontSize,
                    backgroundColor: lineNumbersBackgroundColor,
                    width: lineNumbersPadding ? lineNumbersPadding - 5 : 0,
                  }}
                >
                  {index}
                </Text>
              )}
              <Segment id={id} node={node} index={index} totalItems={totalItems} />
            </View>
          );
        };

        return (
          <FlatList<Node>
            data={rows}
            windowSize={40}
            ref={forwardedRef}
            initialScrollIndex={0}
            initialNumToRender={30}
            scrollEnabled={scrollEnabled}
            testID={`${testID}-scroll-view`}
            contentContainerStyle={[
              syntaxStylesheet.hljs,
              {
                padding: 0,
                paddingTop: 6.5,
                paddingBottom: padding,
              },
            ]}
            style={{
              margin: 0,
              padding: 0,
              width: '100%',
              height: '100%',
              backgroundColor: backgroundColor || syntaxStylesheet.hljs?.background,
            }}
            renderItem={({ item, index }) => (
              <TextNode
                node={item}
                index={index}
                id={`code-line-${index}`}
                totalItems={rows.length}
              />
            )}
          />
        );
      },
    [
      backgroundColor,
      forwardedRef,
      padding,
      scrollEnabled,
      testID,
      fontFamily,
      fontSize,
      highlighterColor,
      inputLineHeight,
      lineNumbersBackgroundColor,
      lineNumbersColor,
      lineNumbersFontSize,
      lineNumbersPadding,
      showLineNumbers,
      syntaxStylesheet,
    ]
  );

  return (
    <Highlighter
      {...highlighterProps}
      customStyle={{
        padding: 0,
      }}
      useInlineStyles
      CodeTag={View}
      PreTag={View}
      renderer={nativeRenderer()}
      testID={testID}
      style={syntaxStylesheet}
    />
  );
};

const SyntaxHighlighterWithForwardRef = React.forwardRef<FlatList<Node>, SyntaxHighlighterProps>(
  (props, ref) => <SyntaxHighlighter {...props} forwardedRef={ref} />
);

export default SyntaxHighlighterWithForwardRef;
