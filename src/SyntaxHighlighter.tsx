import React, { CSSProperties } from 'react';
import { View, ScrollView, Text, Platform, ColorValue } from 'react-native';
import Highlighter, {
    rendererNode as Node,
    SyntaxHighlighterProps as HighlighterProps,
} from 'react-syntax-highlighter';
// @ts-ignore
import * as HLJSSyntaxStyles from 'react-syntax-highlighter/dist/esm/styles/hljs';

export interface rendererProps {
    rows: Node[];
    useInlineStyles: boolean;
    stylesheet: { [key: string]: React.CSSProperties };
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

type generateNewStylesheetProps = {
    stylesheet: Record<string, CSSProperties>;
    highlighter: 'prism' | 'highlightjs';
};

function generateNewStylesheet({ stylesheet, highlighter }: generateNewStylesheetProps) {
    if (styleCache.has(stylesheet)) {
        return styleCache.get(stylesheet);
    }
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
        highlighter === 'prism'
            ? transformedStyle['pre[class*="language-"]']
            : transformedStyle.hljs;
    const defaultColor = topLevel?.color || '#000';
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

    // Prevents the last line from clipping when scrolling
    highlighterProps.children += '\n\n';

    const { transformedStyle, defaultColor } = generateNewStylesheet({
        stylesheet: syntaxStyle,
        highlighter: 'highlightjs',
    });

    // Default values
    const {
        fontFamily = Platform.OS === 'ios' ? 'Menlo-Regular' : 'monospace',
        fontSize = 16,
        backgroundColor = undefined,
        padding = 16,
        lineNumbersColor = 'rgba(127, 127, 127, 0.9)',
        lineNumbersBackgroundColor = undefined,
        highlighterLineHeight = undefined,
        highlighterColor = defaultColor,
    } = addedStyle || {};

    // Only when line numbers are showing
    const lineNumbersPadding = showLineNumbers ? 1.75 * fontSize : undefined;
    const lineNumbersFontSize = 0.7 * fontSize;

    // const renderCode = (nodes: Node[], key = '0') =>
    //     nodes.map<React.ReactNode>((node, index) => {
    //         if (node.children) {
    //             if (key === '0') {
    //                 return (
    //                     <View
    //                         key={`$line.${index}`}
    //                         style={{
    //                             flex: 1,
    //                             margin: 0,
    //                             padding: 0,
    //                             flexDirection: 'row',
    //                             alignItems: 'center',
    //                         }}
    //                     >
    //                         {showLineNumbers && index < nodes.length - 2 && (
    //                             <View
    //                                 style={{
    //                                     marginRight: 5,
    //                                     backgroundColor: lineNumbersBackgroundColor,
    //                                     width: lineNumbersPadding ? lineNumbersPadding - 5 : 0,
    //                                 }}
    //                             >
    //                                 <Text
    //                                     style={{
    //                                         paddingHorizontal: nodes.length - 2 < 100 ? 5 : 0,
    //                                         textAlign: 'center',
    //                                         color: lineNumbersColor,
    //                                         fontFamily,
    //                                         fontSize: lineNumbersFontSize,
    //                                     }}
    //                                 >
    //                                     {index + 1}
    //                                 </Text>
    //                             </View>
    //                         )}
    //                         {renderCode(node.children, `${key}.${index}`)}
    //                     </View>
    //                 );
    //             }

    //             return (
    //                 <Text
    //                     key={`view.line.${index}`}
    //                     style={[
    //                         {
    //                             color: highlighterColor || defaultColor,
    //                         },
    //                         ...(node.properties?.className || []).map((c) => transformedStyle[c]),
    //                         {
    //                             fontFamily,
    //                             fontSize,
    //                             margin: 0,
    //                             alignSelf: 'flex-start',
    //                             lineHeight: highlighterLineHeight,
    //                             height: highlighterLineHeight,
    //                         },
    //                     ]}
    //                 >
    //                     {renderCode(node.children, `${key}.${index}`)}
    //                 </Text>
    //             );
    //         }

    //         return (
    //             <Text
    //                 numberOfLines={1}
    //                 key={`${key}.${index}`}
    //                 style={[
    //                     ...(node.properties?.className || []).map((c) => transformedStyle[c]),
    //                     {
    //                         fontFamily,
    //                         fontSize,
    //                         margin: 0,
    //                         alignSelf: 'flex-start',
    //                         lineHeight: highlighterLineHeight,
    //                         height: highlighterLineHeight,
    //                     },
    //                 ]}
    //             >
    //                 {(node.value as string).replace('\n', '') || ''}
    //             </Text>
    //         );
    //     });

    // const nativeRenderer = ({ rows }: rendererProps) => (
    //     <ScrollView
    //         style={{
    //             width: '100%',
    //             height: '100%',
    //             backgroundColor: backgroundColor || transformedStyle.hljs.background,
    //         }}
    //         contentContainerStyle={[
    //             transformedStyle.hljs,
    //             {
    //                 padding: 0,
    //                 width: '100%',
    //                 height: '100%',
    //                 paddingTop: padding,
    //                 paddingBottom: padding,
    //             },
    //         ]}
    //         testID={`${testID}-scroll-view`}
    //         ref={forwardedRef}
    //         scrollEnabled={scrollEnabled}
    //     >
    //         {renderCode(rows)}
    //     </ScrollView>
    // );

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

    const renderNode = (nodes: Node[], key = '0') =>
        nodes.map<React.ReactNode>((node, index) => {
            if (node.children) {
                const isFirstLineChunk = !(key !== '0' || index >= nodes.length - 2);
                const textElement = (
                    <Text
                        numberOfLines={1}
                        key={`${key}.${index}`}
                        style={[
                            {
                                color: highlighterColor || transformedStyle.hljs.color,
                            },
                            ...(node.properties?.className || []).map((c) => transformedStyle[c]),
                            {
                                lineHeight: highlighterLineHeight,
                                fontFamily,
                                fontSize,
                                paddingLeft: lineNumbersPadding ?? padding,
                            },
                        ]}
                    >
                        {renderNode(node.children, `${key}.${index}`)}
                    </Text>
                );

                return showLineNumbers && isFirstLineChunk ? (
                    <View key={`view.line.${index}`}>
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
                        {textElement}
                    </View>
                ) : (
                    textElement
                );
            }

            if (node.value) {
                // To prevent an empty line after each string
                node.value = node.value.replace('\n', '');
                // To render blank lines at an equal font height
                node.value = node.value.length ? node.value : ' ';
                return <Text key={`${key}.${index}`}>{node.value}</Text>;
            }

            return <Text key={`${key}.${index}`} />;
        });

    const nativeRenderer = ({ rows }: RendererParams) => {
        return (
            <ScrollView
                style={[
                    transformedStyle.hljs,
                    {
                        width: '100%',
                        height: '100%',
                        backgroundColor: backgroundColor || transformedStyle.hljs.background,
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
                {renderNode(rows)}
            </ScrollView>
        );
    };

    return (
        <Highlighter
            {...highlighterProps}
            customStyle={{
                padding: 0,
            }}
            PreTag={View}
            CodeTag={View}
            testID={testID}
            renderer={nativeRenderer}
            style={transformedStyle}
        />
    );
};

const SyntaxHighlighterWithForwardRef = React.forwardRef<ScrollView, SyntaxHighlighterProps>(
    (props, ref) => <SyntaxHighlighter {...props} forwardedRef={ref} />
);

export default SyntaxHighlighterWithForwardRef;
