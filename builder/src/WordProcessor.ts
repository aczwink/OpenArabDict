/**
 * OpenArabDict
 * Copyright (C) 2025-2026 Amir Czwink (amir130@hotmail.de)
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 * 
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 * */
import { OpenArabDictWordRelationshipType, OpenArabDictTranslationEntry, OpenArabDictParentType, OpenArabDictTranslationUsageType, OpenArabDictPOSType } from "@aczwink/openarabdict-domain";
import { GenderedWordDefinition, OtherWordDefinition, TranslationDefinition, UsageDefinition, VerbWordDefinition, WordDefinition, WordReferenceDefinition } from "./DataDefinitions";
import { DBBuilder } from "./DBBuilder";
import { WordDefinitionValidator, WordMapper, WordValidator } from "./WordDefinitionValidator";
import { TreeTrace, TreeTraceNodeType } from "./TreeTrace";
import { ValidateType } from "./_legacy/ValidateType";
import { ValidatePlural } from "./_legacy/ValidatePlural";
import { _LegacyValidateText } from "./_legacy/ValidateText";
import { ValidateFeminine } from "./_legacy/ValidateFeminine";
import { HansWehr4Formatter } from "./formatters/HansWehr4Formatter";
import { ValidateVerbForm } from "./_legacy/ValidateVerbForm";
import { ExtractRoot } from "./shared";
import { VerbalNounCounter } from "./VerbalNounCounter";
import { _LegacyBuildUsage, _LegacyExtractDialect } from "./_LegacyDataDefinition";
import { MapText } from "./mappers/MapText";
import { ValidateText } from "./validators/ValidateText";
import { MapParents } from "./mappers/MapParents";
import { InferTypeFromDerivation } from "./inference/InferTypeFromDerivation";
import { InferGenderFromTypeAndText } from "./inference/InferGenderFromTypeAndText";
import { MapGender } from "./mappers/MapGender";
import { InferTextFromDerivation } from "./inference/InferTextFromDerivation";

export class WordProcessor
{
}

function ProcessTranslationDefinition(x: TranslationDefinition, builder: DBBuilder): OpenArabDictTranslationEntry
{
    function MapUsageType(def: UsageDefinition)
    {
        switch(def.type)
        {
            case "example":
                return OpenArabDictTranslationUsageType.Example;
            case "meaning-in-context":
                return OpenArabDictTranslationUsageType.MeaningInContext;
        }
    }

    HansWehr4Formatter(x);
    
    return {
        dialectId: builder.MapDialectKey(x.dialect)!,
        complete: x.complete,
        text: x.text,
        url: x.url,
        usage: x.usage?.map(y => ({ text: y.text, translation: [y.translation], type: MapUsageType(y) })) ?? _LegacyBuildUsage(x)
    };
}

function ProcessReferenceDefinition(def: WordReferenceDefinition, builder: DBBuilder, parent: TreeTrace)
{
    const wordId = builder.LookupUserWordId(def.ref);
    const word = builder.GetLexeme(wordId);

    if(parent.type !== TreeTraceNodeType.LexicalUnit)
        throw new Error("implement me");
    const parentWordId = parent.parent.lexeme.id;

    word.parent.push({
        id: parentWordId,
        type: OpenArabDictParentType.Plural
    });
}

export function ProcessWordDefinition(wordDef: WordDefinition, builder: DBBuilder, verbalNounCounter: VerbalNounCounter, parent: TreeTrace)
{
    const translations = wordDef.translations?.map(x => ProcessTranslationDefinition(x, builder)) ?? [];

    const wdv = new WordDefinitionValidator(wordDef, parent);

    //mappers
    const mappers: WordMapper[] = [
        MapGender,
        MapParents.bind(undefined, builder),
        MapText
    ];
    for (const mapper of mappers)
        mapper(wordDef, wdv);

    //THE MIXED LEGACY STUFF
    const _legacy: WordValidator[] = [
        ValidateType,
        ValidateFeminine,
        ValidatePlural,
        ValidateVerbForm.bind(undefined, builder),
        _LegacyValidateText.bind(undefined, builder, verbalNounCounter, translations),
    ];
    for (const validator of _legacy)
        validator(wdv);

    //inference
    const inference: WordValidator[] = [
        InferTextFromDerivation.bind(undefined, builder),
        InferTypeFromDerivation,
        //dependency on text and type
        InferGenderFromTypeAndText,
    ];
    for (const inferenceFunc of inference)
        inferenceFunc(wdv);

    //validators
    const validators: WordValidator[] = [
        ValidateText.bind(undefined, builder),
    ];
    for (const validator of validators)
        validator(wdv);

    const result = wdv.ConstructResult();

    let createdWord;
    switch(result.type)
    {
        case OpenArabDictPOSType.Adjective:
        case OpenArabDictPOSType.Noun:
        case OpenArabDictPOSType.Numeral:
        case OpenArabDictPOSType.Pronoun:
        {
            const g = wordDef as GenderedWordDefinition;
            
            const text = result.text ?? g.text;
            if(text === undefined)
            {
                console.log(g);
                throw new Error("Missing text for word!");
            }

            const word = builder.AddWord({
                id: "",
                text,
                parent: result.parents,
                senses: [
                    {
                        units: [
                            {
                                id: "",
                                pos: {
                                    type: result.type,
                                    gender: result.gender!
                                }
                            }
                        ]
                    }
                ]
            }, translations);
            if(g.id !== undefined)
                builder.AddUserWordIdMapping(g.id, word.id);

            if(g.alias !== undefined)
            {
                const aliasWordId = ProcessWordDefinition({
                    type: g.type,
                    derivation: g.derivation,
                    gender: g.gender,
                    translations: g.translations,
                    derived: g.derived,
                    text: g.alias
                }, builder, verbalNounCounter, parent);

                builder.AddRelation(word.id, aliasWordId.id, OpenArabDictWordRelationshipType.Synonym);
            }
            createdWord = word;
        }
        break;
        case OpenArabDictPOSType.Adverb:
        case OpenArabDictPOSType.Conjunction:
        case OpenArabDictPOSType.ForeignVerb:
        case OpenArabDictPOSType.Interjection:
        case OpenArabDictPOSType.Particle:
        case OpenArabDictPOSType.Phrase:
        case OpenArabDictPOSType.Preposition:
        {
            const word = builder.AddWord({
                id: "",
                text: result.text!,
                parent: wdv.parents,
                senses: [
                    {
                        units: [
                            {
                                id: "",
                                pos: {
                                    type: result.type,
                                }
                            }
                        ]
                    }
                ]
            }, translations);

            const o = wordDef as OtherWordDefinition;
            if(o.alias !== undefined)
            {
                const aliasWordId = ProcessWordDefinition({
                    type: o.type,
                    derivation: o.derivation,
                    text: o.alias,
                    translations: o.translations,
                }, builder, verbalNounCounter, parent);

                builder.AddRelation(word.id, aliasWordId.id, OpenArabDictWordRelationshipType.Synonym);
            }

            createdWord = word;
        }
        break;
        case OpenArabDictPOSType.Verb:
        {
            const v = wordDef as VerbWordDefinition;
            const form = wdv.verbForm;
            const root = ExtractRoot(builder, parent);

            const generatedVerb = builder.AddWord({
                id: "",
                text: wdv.text,
                parent: wdv.parents,
                senses: [
                    {
                        units: [
                            {
                                id: "",
                                pos: {
                                    type: OpenArabDictPOSType.Verb,
                                    form,
                                    rootId: root.id,
                                }
                            }
                        ]
                    }
                ]
            }, translations);

            if(v.alias !== undefined)
            {
                const aliasWordId = ProcessWordDefinition({
                    type: v.type,
                    form: {
                        stem: 1,
                        variants: [
                            { dialect: _LegacyExtractDialect(v), parameters: v.alias }
                        ],
                    },
                    translations: v.translations
                }, builder, verbalNounCounter, parent);

                builder.AddRelation(generatedVerb.id, aliasWordId.id, OpenArabDictWordRelationshipType.Synonym);
            }

            createdWord = generatedVerb;
        }
        break;
        default:
            throw new Error("Unknown word type");
    }
    const wordParent: TreeTrace = {
        type: "word",
        lexeme: createdWord,
        parent
    };
    const thisParent: TreeTrace = {
        type: TreeTraceNodeType.LexicalUnit,
        lexicalUnitId: createdWord.senses[0].units[0].id,
        parent: wordParent
    };

    if(wordDef.derived !== undefined)
    {
        for (const child of wordDef.derived)
        {
            if("ref" in child)
                ProcessReferenceDefinition(child, builder, thisParent);
            else
                ProcessWordDefinition(child, builder, verbalNounCounter, thisParent);
        }
    }

    return createdWord!;
}