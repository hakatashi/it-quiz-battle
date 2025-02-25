import {test, expect, describe} from 'vitest';
import {formatQuizToSsml} from './addQuizzes.js';
import {oneLineTrim} from 'common-tags';

describe('formatQuizToSsml', () => {
	test('converts text to SSML', async () => {
		const text = 'これはテストです。';
		const ssml = await formatQuizToSsml(text);
		expect(ssml).toStrictEqual({
			clauses: ['これは', 'テストです', '。'],
			ssml: '<speak>これは<mark name="c0"/>テストです<mark name="c1"/>。<mark name="c2"/></speak>',
		});
	});

	test('converts text with ruby to SSML', async () => {
		const text = oneLineTrim`
			関西の私立大学でいわゆる「
			<ruby><rb>関</rb><rp>（</rp><rt>かん</rt><rp>）</rp></ruby>
			<ruby><rb>関</rb><rp>（</rp><rt>かん</rt><rp>）</rp></ruby>
			<ruby><rb>同</rb><rp>（</rp><rt>どう</rt><rp>）</rp></ruby>
			<ruby><rb>立</rb><rp>（</rp><rt>りつ</rt><rp>）</rp></ruby>
			」と括られるのは、
			<ruby><rb>関西</rb><rp>（</rp><rt>かんさい</rt><rp>）</rp></ruby>
			大学、
			<ruby><rb>関西</rb><rp>（</rp><rt>かんせい</rt><rp>）</rp></ruby>
			学院大学、同志社大学とどこでしょう？
		`;
		const ssml = await formatQuizToSsml(text);
		expect(ssml.clauses).toStrictEqual([
			'関西の',
			'私立大学で',
			'いわゆる',
			'「',
			'<ruby><rb>関</rb><rp>（</rp><rt>かん</rt><rp>）</rp></ruby><ruby><rb>関</rb><rp>（</rp><rt>かん</rt><rp>）</rp></ruby>',
			'<ruby><rb>同</rb><rp>（</rp><rt>どう</rt><rp>）</rp></ruby><ruby><rb>立</rb><rp>（</rp><rt>りつ</rt><rp>）</rp></ruby>',
			'」',
			'と',
			'括られるのは',
			'、',
			'<ruby><rb>関西</rb><rp>（</rp><rt>かんさい</rt><rp>）</rp></ruby>大学',
			'、',
			'<ruby><rb>関西</rb><rp>（</rp><rt>かんせい</rt><rp>）</rp></ruby>学院大学',
			'、',
			'同志社大学と',
			'どこでしょう',
			'？',
		]);
		expect(ssml.ssml).toStrictEqual(oneLineTrim`
			<speak>
				関西の
				<mark name="c0"/>
				私立大学で
				<mark name="c1"/>
				いわゆる
				<mark name="c2"/>
				「
				<mark name="c3"/>
				かんかん
				<mark name="c4"/>
				どうりつ
				<mark name="c5"/>
				」
				<mark name="c6"/>
				と
				<mark name="c7"/>
				括られるのは
				<mark name="c8"/>
				、
				<mark name="c9"/>
				かんさい大学
				<mark name="c10"/>
				、
				<mark name="c11"/>
				かんせい学院大学
				<mark name="c12"/>
				、
				<mark name="c13"/>
				同志社大学と
				<mark name="c14"/>
				どこでしょう
				<mark name="c15"/>
				？
				<mark name="c16"/>
			</speak>
		`);
	});

	test('converts text with emphasis to SSML', async () => {
		const text = oneLineTrim`
			<em>TCP/IPにおける1パケットは</em>
			最大65535バイトですが、
			通信量の単位として用いられるパケットは何バイトを1とするでしょう？
		`;
		const ssml = await formatQuizToSsml(text);
		expect(ssml.clauses).toStrictEqual([
			'<em>TCP/IPにおける</em>',
			'<em>1パケットは</em>',
			'最大65535バイトですが',
			'、',
			'通信量の',
			'単位として',
			'用いられる',
			'パケットは',
			'何バイトを',
			'1と',
			'するでしょう',
			'？',
		]);
		expect(ssml.ssml).toStrictEqual(oneLineTrim`
			<speak>
				<emphasis level="strong">
					<prosody pitch="+3st">
						TCP/IPにおける
						<mark name="c0"/>
						1パケットは
						<mark name="c1"/>
					</prosody>
				</emphasis>
				最大65535バイトですが
				<mark name="c2"/>
				、
				<mark name="c3"/>
				通信量の
				<mark name="c4"/>
				単位として
				<mark name="c5"/>
				用いられる
				<mark name="c6"/>
				パケットは
				<mark name="c7"/>
				何バイトを
				<mark name="c8"/>
				1と
				<mark name="c9"/>
				するでしょう
				<mark name="c10"/>
				？
				<mark name="c11"/>
			</speak>
		`);
	});
});
