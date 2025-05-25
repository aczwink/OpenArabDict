/**
 * OpenArabDict
 * Copyright (C) 2025 Amir Czwink (amir130@hotmail.de)
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
import { OpenArabDictWordType, OpenArabDictVerbDerivationType, OpenArabDictNonVerbDerivationType, OpenArabDictWordParent, OpenArabDictWordParentType, OpenArabDictWordRelationshipType, OpenArabDictVerbType, OpenArabDictTranslationEntry } from "openarabdict-domain";
import { Conjugator } from "openarabicconjugation/dist/Conjugator";
import { AdvancedStemNumber, Gender, Numerus, Person, Tense, Voice } from "openarabicconjugation/dist/Definitions";
import { GetDialectMetadata } from "openarabicconjugation/dist/DialectsMetadata";
import { CreateVerb } from "openarabicconjugation/dist/Verb";
import { VerbRoot } from "openarabicconjugation/dist/VerbRoot";
import { VocalizedWordTostring } from "openarabicconjugation/dist/Vocalization";
import { GenderedWordDefinition, OtherWordDefinition, TranslationDefinition, VerbWordDefinition, WordDefinition } from "./DataDefinitions";
import { DBBuilder } from "./DBBuilder";
import { DialectMapper } from "./DialectMapper";
import { WordDefinitionValidator, WordValidator } from "./WordDefinitionValidator";
import { TreeTrace } from "./TreeTrace";
import { ValidateType } from "./validators/ValidateType";
import { ValidateGender } from "./validators/ValidateGender";
import { ValidatePlural } from "./validators/ValidatePlural";
import { ValidateText } from "./validators/ValidateText";
import { ValidateFeminine } from "./validators/ValidateFeminine";
import { MapVerbTypeToOpenArabicConjugation } from "./shared";
import { HansWehr4Formatter } from "./formatters/HansWehr4Formatter";

export class WordProcessor
{
}

function ProcessTranslationDefinition(x: TranslationDefinition, builder: DBBuilder): OpenArabDictTranslationEntry
{
    HansWehr4Formatter(x);
    
    return {
        dialectId: builder.MapDialectKey(x.dialect)!,
        complete: x.complete,
        contextual: x.contextual,
        examples: x.examples,
        text: x.text,
        url: x.url
    };
}

export function ProcessWordDefinition(wordDef: WordDefinition, builder: DBBuilder, dialectMapper: DialectMapper, parent?: TreeTrace)
{
    const wdv = new WordDefinitionValidator(wordDef, parent);
    const validators: WordValidator[] = [
        ValidateType,
        ValidateGender,
        ValidateFeminine,
        ValidatePlural,
        ValidateText.bind(undefined, builder)
    ];
    for (const validator of validators)
        validator(wdv);

    const result = wdv.ConstructResult();

    function MapVerbDerivationType(derivation: string)
    {
        switch(derivation)
        {
            case "active-participle":
                return OpenArabDictVerbDerivationType.ActiveParticiple;
            case "colloquial":
                return OpenArabDictVerbDerivationType.Colloquial;
            case "meaning-related":
                return OpenArabDictVerbDerivationType.MeaningRelated;
            case "passive-participle":
                return OpenArabDictVerbDerivationType.PassiveParticiple;
            case "verbal-noun":
                return OpenArabDictVerbDerivationType.VerbalNoun;
            default:
                throw new Error(derivation);
        }
    }

    function MapWordDerivationType(derivation: string)
    {
        switch(derivation)
        {
            case "adverbial-accusative":
                return OpenArabDictNonVerbDerivationType.AdverbialAccusative;
            case "colloquial":
                return OpenArabDictNonVerbDerivationType.Colloquial;
            case "elative-degree":
                return OpenArabDictNonVerbDerivationType.ElativeDegree;
            case "extension":
                return OpenArabDictNonVerbDerivationType.Extension;
            case "feminine":
                return OpenArabDictNonVerbDerivationType.Feminine;
            case "nisba":
                return OpenArabDictNonVerbDerivationType.Nisba;
            case "plural":
                return OpenArabDictNonVerbDerivationType.Plural;
            case "singulative":
                return OpenArabDictNonVerbDerivationType.Singulative;
            default:
                throw new Error(derivation);
        }
    }

    function MapParent(derivation: string, parent?: TreeTrace): OpenArabDictWordParent | undefined
    {
        switch(parent?.type)
        {
            case "root":
                return {
                    type: OpenArabDictWordParentType.Root,
                    rootId: parent.rootId
                };
            case "verb":
                return {
                    type: OpenArabDictWordParentType.Verb,
                    verbId: parent.verbId,
                    derivation: MapVerbDerivationType(derivation)
                };
            case "word":
                return {
                    type: OpenArabDictWordParentType.NonVerbWord,
                    wordId: parent.word.id,
                    relationType: MapWordDerivationType(derivation)
                }
        }
    }

    function MapVerbType(verb: VerbWordDefinition)
    {
        if(typeof verb.form === "number")
            return undefined;
        switch(verb.form.type)
        {
            case "defective":
                return OpenArabDictVerbType.Defective;
            case "sound":
                return OpenArabDictVerbType.Sound;
        }
        return undefined;
    }

    const translations = wordDef.translations?.map(x => ProcessTranslationDefinition(x, builder)) ?? [];

    let thisParent: TreeTrace | undefined = undefined;
    let createdWord;
    switch(result.type)
    {
        case OpenArabDictWordType.Adjective:
        case OpenArabDictWordType.Noun:
        case OpenArabDictWordType.Numeral:
        case OpenArabDictWordType.Pronoun:
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
                type: result.type,
                isMale: result.isMale!,
                text,
                translations,
                parent: MapParent(g.derivation, parent)
            });

            if(g.alias !== undefined)
            {
                const aliasWordId = ProcessWordDefinition({
                    type: g.type,
                    derivation: g.derivation,
                    gender: g.gender,
                    translations: g.translations,
                    derived: g.derived,
                    text: g.alias
                }, builder, dialectMapper, parent);

                builder.AddRelation(word.id, aliasWordId.id, OpenArabDictWordRelationshipType.Synonym);
            }

            thisParent = {
                type: "word",
                word
            };
            createdWord = word;
        }
        break;
        case OpenArabDictWordType.Adverb:
        case OpenArabDictWordType.Conjunction:
        case OpenArabDictWordType.ForeignVerb:
        case OpenArabDictWordType.Interjection:
        case OpenArabDictWordType.Particle:
        case OpenArabDictWordType.Phrase:
        case OpenArabDictWordType.Preposition:
        {
            const o = wordDef as OtherWordDefinition;
            const word = builder.AddWord({
                id: "",
                type: result.type,
                text: o.text,
                translations,
                parent: MapParent(o.derivation, parent)
            });

            if(o.alias !== undefined)
            {
                const aliasWordId = ProcessWordDefinition({
                    type: o.type,
                    derivation: o.derivation,
                    text: o.alias,
                    translations: o.translations,
                }, builder, dialectMapper, parent);

                builder.AddRelation(word.id, aliasWordId.id, OpenArabDictWordRelationshipType.Synonym);
            }

            thisParent = {
                type: "word",
                word
            };
            createdWord = word;
        }
        break;
        case OpenArabDictWordType.Verb:
        {
            let rootId;
            if(parent?.type === "root")
                rootId = parent.rootId;
            else if(parent?.type === "verb")
            {
                const parentWord = builder.GetWord(parent.verbId);
                if(parentWord.type !== OpenArabDictWordType.Verb)
                    throw new Error("ID ERROR!");
                rootId = parentWord.rootId;
            }
            else
                throw new Error("Verbs must be direct children of a root or a verb");
            const root = builder.GetRoot(rootId);

            const v = wordDef as VerbWordDefinition;
            const dialectId = builder.MapDialectKey(v.dialect)!;
            const dialectType = dialectMapper.Map(dialectId)!;

            const rootInstance = new VerbRoot(root!.radicals);

            const stemNumber = (typeof v.form === "number") ? v.form : v.form.stem;
            let verb;
            if(typeof v.form !== "number")
            {
                const meta = GetDialectMetadata(dialectType);
                const verbType = MapVerbTypeToOpenArabicConjugation(MapVerbType(v));
                const defVerbType = verbType ?? rootInstance.DeriveDeducedVerbType();
                const choices = meta.GetStem1ContextChoices(defVerbType, rootInstance);
                if((v.form.stem === 1) && !choices.types.includes(v.form.parameters))
                {
                    console.log(wordDef, wordDef.translations);
                    throw new Error("Wrong stem parameterization");
                }
                const stem = (v.form.stem === 1) ? v.form.parameters : v.form.stem;
                verb = CreateVerb(dialectType, rootInstance, stem, verbType);
            }
            else
                verb = CreateVerb(dialectType, rootInstance, v.form as AdvancedStemNumber);

            const conjugator = new Conjugator;
            const vocalized = conjugator.Conjugate(verb, {
                gender: Gender.Male,
                numerus: Numerus.Singular,
                person: Person.Third,
                tense: Tense.Perfect,
                voice: Voice.Active,
            });

            const conjugatedWord = VocalizedWordTostring(vocalized);

            const generatedVerb = builder.AddWord({
                id: "",
                type: OpenArabDictWordType.Verb,
                dialectId,
                rootId: root!.id,
                stem: stemNumber,
                text: conjugatedWord,
                stemParameters: ((typeof v.form !== "number") && (v.form.stem === 1)) ? v.form.parameters : undefined,
                translations,
                verbType: MapVerbType(v),
                parent: MapParent(v.derivation!, parent) ?? ({ type: OpenArabDictWordParentType.Root, rootId: root.id})
            });

            if(v.alias !== undefined)
            {
                const aliasWordId = ProcessWordDefinition({
                    type: v.type,
                    dialect: v.dialect,
                    form: {
                        stem: 1,
                        parameters: v.alias
                    },
                    translations: v.translations
                }, builder, dialectMapper, parent);

                builder.AddRelation(generatedVerb.id, aliasWordId.id, OpenArabDictWordRelationshipType.Synonym);
            }

            thisParent = {
                type: "verb",
                verbId: generatedVerb.id,
                parent
            };
            createdWord = generatedVerb;
        }
        break;
    }

    if(wordDef.derived !== undefined)
    {
        for (const child of wordDef.derived)
        {
            ProcessWordDefinition(child, builder, dialectMapper, thisParent);
        }
    }

    return createdWord!;
}