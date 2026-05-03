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

import { OpenArabDictGender, OpenArabDictParent, OpenArabDictPOSType, OpenArabDictVerbForm } from "@aczwink/openarabdict-domain";
import { WordDefinition } from "./DataDefinitions";
import { TreeTrace, TreeTraceNodeType } from "./TreeTrace";
import { GlobalInjector } from "@aczwink/acts-util-node";
import { StatisticsCounterService, StatisticsCounter } from "./services/StatisticsCounterService";
import { DisplayVocalized, ParseVocalizedText, VocalizedWordTostring } from "@aczwink/openarabicconjugation/dist/Vocalization";
import { Buckwalter } from "@aczwink/openarabicconjugation/dist/Transliteration";
import { ArabicText } from "@aczwink/openarabicconjugation";

export type WordMapper = (wordDef: WordDefinition, validator: WordDefinitionValidator) => void;
export type WordValidator = (validator: WordDefinitionValidator) => void;

export class WordDefinitionValidator
{
    constructor(private wordDef: WordDefinition, private _sourceTreeTrace?: TreeTrace)
    {
    }

    //Properties
    public set gender(value: OpenArabDictGender)
    {
        this.Assign("gender", value);
    }

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

    public get sourceTreeTrace()
    {
        return this._sourceTreeTrace;
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
        if(this._type === undefined)
            this.ReportValidationError("Word type missing");
        return this._type!;
    }

    public set type(value: OpenArabDictPOSType | undefined)
    {
        if(this._type === value)
            return;

        if(this._type !== undefined)
            this.ReportValidationError("Can't change word type");
        this._type = value;
    }

    public get verbForm()
    {
        if(this._type !== OpenArabDictPOSType.Verb)
            this.ReportValidationError("Verb forms do only exist on verbs");
        if(this._verbForm === undefined)
            this.ReportValidationError("Verb form not set");

        return this._verbForm!;
    }

    public set verbForm(newValue: OpenArabDictVerbForm)
    {
        if(this._type !== OpenArabDictPOSType.Verb)
            this.ReportValidationError("Verb forms do only exist on verbs");
        this._verbForm = newValue;
    }

    public get _legacyWordDefinition()
    {
        return this.wordDef;
    }

    //Public methods
    public ConstructResult()
    {
        switch(this._type)
        {
            case OpenArabDictPOSType.Adjective:
            case OpenArabDictPOSType.Noun:
            case OpenArabDictPOSType.Numeral:
            case OpenArabDictPOSType.Pronoun:
                {
                    if(this._gender === undefined)
                        this.ReportValidationError("Gender is missing");
                    if(this._text === undefined)
                        this.ReportValidationError("Text is missing");
                }
        }

        return {
            gender: this._gender,
            type: this.type,
            text: this._text,
            parents: this._parents ?? []
        };
    }

    InferAnyOf(variable: "gender", allowedValues: OpenArabDictGender[], defaultValue: OpenArabDictGender): void;
    InferAnyOf(variable: "type", allowedValues: OpenArabDictPOSType[], defaultValue: OpenArabDictPOSType): void;
    public InferAnyOf(variable: "gender" | "text" | "type", allowedValues: (OpenArabDictGender | OpenArabDictPOSType)[], defaultValue: OpenArabDictGender | OpenArabDictPOSType)
    {
        const got = this.Get(variable);
        for (const choice of allowedValues)
        {
            if(got === choice)
            {
                if(choice === defaultValue)
                    this.ReportRedundancy(variable, defaultValue);
                return;
            }
        }
        if(got === undefined)
        {
            this.Assign(variable, defaultValue);
            return;
        }

        console.log(got, allowedValues);
        throw new Error("Variable '" + variable + "' has illegal value. Trace: " + this.TraceToString());
    }

    InferDefault(variable: "gender", defaultValue: OpenArabDictGender): void;
    InferDefault(variable: "text", value: DisplayVocalized[]): void;
    InferDefault(variable: "type", defaultValue: OpenArabDictPOSType): void;
    public InferDefault(variable: "gender" | "text" | "type", defaultValue: OpenArabDictGender | DisplayVocalized[] | OpenArabDictPOSType)
    {
        const got = this.Get(variable);
        if(got === undefined)
            this.Assign(variable, defaultValue);
        else
            this.CheckRedundancy(variable, defaultValue);
    }

    InferValue(variable: "text", value: DisplayVocalized[] | string): void;
    InferValue(variable: "type", value: OpenArabDictPOSType): void;
    public InferValue(variable: "text" | "type", value: DisplayVocalized[] | string | OpenArabDictPOSType)
    {
        const got = this.Get(variable);
        if(got === undefined)
            this.Assign(variable, value);
        else if(this.Equals(variable, got, value))
            this.CheckRedundancy(variable, value);
        else
        {
            this.ReportValidationError("Variable has wrong value assigned. Got: " + this.ValueToValidationErrorString(got) + " Expected: " + this.ValueToValidationErrorString(value));
        }
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

    //Private methods
    private Assign(variable: "gender" | "text" | "type", value: any)
    {
        const alreadyAssigned = this.Get(variable);
        if((alreadyAssigned !== undefined) && this.Equals(variable, alreadyAssigned, value))
            this.ReportRedundancy(variable, value);

        switch(variable)
        {
            case "gender":
                this._gender = value;
                break;
            case "text":
                if(Array.isArray(value))
                    this._text = VocalizedWordTostring(value);
                else
                    this._text = value;
                break;
            case "type":
                this._type = value;
                break;
        }
    }

    private CheckRedundancy(variable: "gender" | "text" | "type", value: any)
    {
        if(this.Equals(variable, this.Get(variable)!, value))
            this.ReportRedundancy(variable, value);
    }

    private Equals(variable: "gender" | "text" | "type", got: string | OpenArabDictPOSType | OpenArabDictGender, value: string | OpenArabDictPOSType | DisplayVocalized[])
    {
        switch(variable)
        {
            case "text":
                return ArabicText.EqualsVocalized(ParseVocalizedText(got as string), Array.isArray(value) ? value : ParseVocalizedText(value as string));
        }
        return got === value;
    }

    private Get(variable: "gender" | "text" | "type")
    {
        switch(variable)
        {
            case "gender":
                return this._gender;
            case "text":
                return this._text;
            case "type":
                return this._type;
        }
    }

    private ReportRedundancy(variable: string, defaultValue: any)
    {
        const statsService = GlobalInjector.Resolve(StatisticsCounterService);
        statsService.Increment(StatisticsCounter.RedundantAssignment);
        console.log("Redundant assignment of variable '" + variable + "'. Trace: " + this.TraceToString());
    }

    private ReportValidationError(message: string)
    {
        throw new Error(message + " Trace: " + this.TraceToString());
    }

    private TraceNodeToString(node?: TreeTrace): string[]
    {
        if(node === undefined)
            return [];

        switch(node.type)
        {
            case "root":
                return ["ROOT: " + node.rootId + ", file: " + node.fileName];
            case TreeTraceNodeType.LexicalUnit:
            {
                const parentTrace = this.TraceNodeToString(node.parent);
                parentTrace.push("VERB: " + node.lexicalUnitId);
                return parentTrace;
            }
            case "word":
                const parentTrace = this.TraceNodeToString(node.parent);
                parentTrace.push(node.lexeme.text);
                return parentTrace;
            case "word-collection":
                return ["file: " + node.fileName];
        }
    }

    private TraceToString()
    {
        const traces = this.TraceNodeToString(this._sourceTreeTrace);
        if(("text" in this.wordDef) && (this.wordDef.text !== undefined))
            traces.push(this.wordDef.text);
        else
            console.log(this.wordDef);
        return traces.join(" --> ");
    }

    private ValueToValidationErrorString(value: string | OpenArabDictPOSType | OpenArabDictGender | DisplayVocalized[])
    {
        if(Array.isArray(value))
            return Buckwalter.ToString(value) + " " + VocalizedWordTostring(value);
        return value + "";
    }

    //State
    private _gender?: OpenArabDictGender;
    private _parents?: OpenArabDictParent[];
    private _text?: string;
    private _type?: OpenArabDictPOSType;
    private _verbForm?: OpenArabDictVerbForm;
}