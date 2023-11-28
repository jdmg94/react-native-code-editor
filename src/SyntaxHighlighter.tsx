import React, { CSSProperties } from 'react';
import { View, ScrollView, Text, Platform, ColorValue, TextStyle } from 'react-native';
import Highlighter, { SyntaxHighlighterProps as HighlighterProps } from 'react-syntax-highlighter';
// @ts-ignore
import * as HLJSSyntaxStyles from 'react-syntax-highlighter/dist/esm/styles/hljs';

export interface Node {
    type: 'element' | 'text';
    value?: string | number | undefined;
    tagName?: keyof JSX.IntrinsicElements | React.ComponentType<any> | undefined;
    properties?: { className: any[]; [key: string]: any };
    children?: Node[];
}
export interface rendererProps {
    rows: Node[];
    stylesheet: { [key: string]: React.CSSProperties };
    useInlineStyles: boolean;
}

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
    syntaxStyle?: typeof SyntaxHighlighterSyntaxStyles;

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

type PropsWithForwardRef = SyntaxHighlighterProps & {
    forwardedRef: React.Ref<ScrollView>;
};

const SyntaxHighlighter = (props: PropsWithForwardRef): JSX.Element => {
    const {
        syntaxStyle = SyntaxHighlighterSyntaxStyles.atomOneDark,
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
        lineNumbersColor = 'rgba(127, 127, 127, 0.9)',
        lineNumbersBackgroundColor = undefined,
        highlighterLineHeight = undefined,
        highlighterColor = undefined,
    } = addedStyle || {};

    // Only when line numbers are showing
    const lineNumbersPadding = showLineNumbers ? 1.75 * fontSize : undefined;
    const lineNumbersFontSize = 0.7 * fontSize;

    // Prevents the last line from clipping when scrolling
    highlighterProps.children += '\n\n';

    const cleanStyle = (style: TextStyle) => {
        const clean: TextStyle = {
            ...style,
            display: undefined,
        };
        return clean;
    };

    const stylesheet = Object.fromEntries(
        Object.entries(syntaxStyle as Record<string, React.CSSProperties>).map(
            ([className, style]) => [className, cleanStyle(style as TextStyle)]
        )
    );

    const renderLineNumbersBackground = () => (
        <View
            style={{
                position: 'absolute',
                top: -padding,
                left: 0,
                bottom: 0,
                width: lineNumbersPadding ? lineNumbersPadding - 5 : 0,
                backgroundColor: lineNumbersBackgroundColor,
            }}
        />
    );

    const renderCode = (nodes: Node[], key = '0') =>
        nodes.map<React.ReactNode>((node, index) => {
            if (node.children) {
                return (
                    <View key={`view.line.${index}`}>
                        {!(key !== '0' || index >= nodes.length - 2) && showLineNumbers && (
                            <Text
                                key={`$line.${index}`}
                                style={{
                                    position: 'absolute',
                                    top: 5,
                                    bottom: 0,
                                    paddingHorizontal: nodes.length - 2 < 100 ? 5 : 0,
                                    textAlign: 'center',
                                    color: lineNumbersColor,
                                    fontFamily,
                                    fontSize: lineNumbersFontSize,
                                    width: lineNumbersPadding ? lineNumbersPadding - 5 : 0,
                                }}
                            >
                                {index + 1}
                            </Text>
                        )}
                        {renderCode(node.children, `${key}.${index}`)}
                    </View>
                );
            }

            if (node.value) {
                // To prevent an empty line after each string
                node.value = (node.value as string).replace('\n', '');

                return (
                    <Text
                        numberOfLines={1}
                        key={`${key}.${index}`}
                        style={[
                            {
                                color: highlighterColor || stylesheet.hljs.color,
                            },
                            ...(node.properties?.className || []).map((c) => stylesheet[c]),
                            {
                                lineHeight: highlighterLineHeight,
                                fontFamily,
                                fontSize,
                                paddingLeft: lineNumbersPadding ?? padding,
                            },
                        ]}
                    >
                        {node.value || ''}
                    </Text>
                );
            }

            return <></>;
        });

    const nativeRenderer = ({ rows }: rendererProps) => {
        return (
            <ScrollView
                style={[
                    stylesheet.hljs,
                    {
                        width: '100%',
                        height: '100%',
                        // @ts-ignore
                        backgroundColor: backgroundColor || stylesheet.hljs.background,
                        // Prevents YGValue error
                        padding: 0,
                        paddingTop: padding,
                        paddingRight: padding,
                        paddingBottom: padding,
                    },
                ]}
                testID={`${testID}-scroll-view`}
                ref={forwardedRef}
                scrollEnabled={scrollEnabled}
            >
                {showLineNumbers && renderLineNumbersBackground()}
                {renderCode(rows)}
            </ScrollView>
        );
    };

    return (
        <Highlighter
            {...highlighterProps}
            customStyle={{
                padding: 0,
            }}
            CodeTag={View}
            PreTag={View}
            renderer={nativeRenderer}
            testID={testID}
            style={stylesheet as Record<string, CSSProperties>}
        />
    );
};

const SyntaxHighlighterWithForwardRef = React.forwardRef<ScrollView, SyntaxHighlighterProps>(
    (props, ref) => <SyntaxHighlighter {...props} forwardedRef={ref} />
);

export default SyntaxHighlighterWithForwardRef;
