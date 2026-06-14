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

import { OpenArabDictParent, OpenArabDictPOSType, OpenArabDictVerbForm } from "@aczwink/openarabdict-domain";
import { DisplayVocalized, ParseVocalizedText, VocalizedWordTostring } from "@aczwink/openarabicconjugation/dist/Vocalization";
import { Buckwalter } from "@aczwink/openarabicconjugation/dist/Transliteration";
import { ArabicText } from "@aczwink/openarabicconjugation";
import { WordDefinition } from "../DataDefinitions";
import { TreeTrace } from "../TreeTrace";
import { DefinitionValidator } from "./DefinitionValidator";
import { SenseDefinitionValidator } from "./SenseDefinitionValidator";

export type WordMapper = (wordDef: WordDefinition, validator: WordDefinitionValidator) => void;
export type WordValidator = (validator: WordDefinitionValidator) => void;

export class WordDefinitionValidator extends DefinitionValidator<"text" | "type">
{
    constructor(wordDef: WordDefinition, _sourceTreeTrace?: TreeTrace)
    {
        super(wordDef, _sourceTreeTrace);

        this.senseDefValidators = [];
    }

    //Properties
    public get parents()
    {
        if(this._parents === undefined)
            this.ReportValidationError("Parents missing");
        return this._parents!;
    }

    public set parents(value: OpenArabDictParent[])
    {
        this._parents = value;
    }

    public get senses(): readonly SenseDefinitionValidator[]
    {
        return this.senseDefValidators;
    }

    public get text()
    {
        if(this._text === undefined)
            this.ReportValidationError("Text missing");
        return this._text!;
    }

    public set text(value: string)
    {
        this._text = value;
    }

    public get type()
    {
        const types = this.senseDefValidators.Values().Map(x => x.lexicalUnits.map(x => x.type).Values()).Flatten().Distinct(x => x?.toString() ?? "undefined").ToArray();
        if(types.length === 1)
            return types[0];
        this.ReportValidationError("Definition is complex");
    }

    public set type(value: OpenArabDictPOSType | undefined)
    {
        if(this.senseDefValidators.length > 1)
        {
            for (const sense of this.senseDefValidators)
                sense.type = value;
        }
        else
            this.Sense(0).type = value;
    }

    public set verbForm(newValue: OpenArabDictVerbForm)
    {
        if(this.senseDefValidators.length > 1)
        {
            for (const sense of this.senseDefValidators)
                sense.verbForm = newValue;
        }
        else
            this.Sense(0).verbForm = newValue;
    }

    //Public methods
    public ConstructResult()
    {
        return {
            text: this.text,
            parents: this._parents ?? [],
            senses: this.senseDefValidators.map(x => x.ConstructResult()),
        };
    }

    InferAnyOf(variable: "type", allowedValues: OpenArabDictPOSType[], defaultValue: OpenArabDictPOSType): void;
    public InferAnyOf(variable: "type", allowedValues: OpenArabDictPOSType[], defaultValue: OpenArabDictPOSType)
    {
        return super.InferAnyOfImpl(variable, allowedValues, defaultValue);
    }

    InferDefault(variable: "text", value: DisplayVocalized[]): void;
    InferDefault(variable: "type", defaultValue: OpenArabDictPOSType): void;
    public InferDefault(variable: "text" | "type", defaultValue: DisplayVocalized[] | OpenArabDictPOSType)
    {
        return super.InferDefaultImpl(variable, defaultValue);
    }

    InferValue(variable: "text", value: DisplayVocalized[] | string): void;
    InferValue(variable: "type", value: OpenArabDictPOSType): void;
    public InferValue(variable: "text" | "type", value: DisplayVocalized[] | string | OpenArabDictPOSType)
    {
        return super.InferValueImpl(variable, value);
    }

    public Sense(index: number)
    {
        if(this.senseDefValidators[index] === undefined)
            this.senseDefValidators[index] = new SenseDefinitionValidator(this.wordDef, this.sourceTreeTrace);

        return this.senseDefValidators[index];
    }

    public ValidateAnyOf(variable: "text", allowedValues: DisplayVocalized[][])
    {
        const parsed = ParseVocalizedText(this.text);
        for (const choice of allowedValues)
        {
            if(ArabicText.EqualsVocalized(choice, parsed))
                return;
        }

        const choices = allowedValues.map(VocalizedWordTostring).join(", ");
        throw new Error("Illegal text definition for word. Got: " + this.text + ", " + Buckwalter.ToString(parsed) + ". But allowed values are: " + choices);
    }

    //Protected methods
    protected Get(variable: "text" | "type")
    {
        switch(variable)
        {
            case "text":
                return this._text;
            case "type":
                return this._type;
        }
    }

    protected Set(variable: "text" | "type", value: string | OpenArabDictPOSType | DisplayVocalized[])
    {
        switch(variable)
        {
            case "text":
                if(Array.isArray(value))
                    this._text = VocalizedWordTostring(value);
                else
                    this._text = value as string;
                break;
            case "type":
                this.type = value as OpenArabDictPOSType;
                break;
        }
    }

    //Private properties
    private get _type()
    {
        const types = this.senseDefValidators.Values().Map(x => x.lexicalUnits.map(x => x.__legacyType).Values()).Flatten().Distinct(x => x?.toString() ?? "undefined").ToArray();
        if(types.length === 1)
            return types[0];
        this.ReportValidationError("Definition is complex");
    }

    //State
    private _parents?: OpenArabDictParent[];
    private _text?: string;
    private senseDefValidators: SenseDefinitionValidator[];
}