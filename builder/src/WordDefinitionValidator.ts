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

import { OpenArabDictVerbForm, OpenArabDictWordType } from "@aczwink/openarabdict-domain";
import { WordDefinition } from "./DataDefinitions";
import { TreeTrace } from "./TreeTrace";
import { GlobalInjector } from "@aczwink/acts-util-node";
import { StatisticsCounterService, StatisticsCounter } from "./services/StatisticsCounterService";

type InferableValue = boolean | number | string;

export type WordValidator = (validator: WordDefinitionValidator) => void;

export class WordDefinitionValidator
{
    constructor(private wordDef: WordDefinition, private _parent?: TreeTrace)
    {
    }

    //Properties
    public set isMale(value: boolean | undefined)
    {
        this._isMale = value;
    }

    public get parent()
    {
        return this._parent;
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

    public set type(value: OpenArabDictWordType | undefined)
    {
        if(this._type === value)
            return;

        if(this._type !== undefined)
            this.ReportValidationError("Can't change word type");
        this._type = value;
    }

    public get verbForm()
    {
        if(this._type !== OpenArabDictWordType.Verb)
            this.ReportValidationError("Verb forms do only exist on verbs");
        if(this._verbForm === undefined)
            this.ReportValidationError("Verb form not set");

        return this._verbForm!;
    }

    public set verbForm(newValue: OpenArabDictVerbForm)
    {
        if(this._type !== OpenArabDictWordType.Verb)
            this.ReportValidationError("Verb forms do only exist on verbs");
        this._verbForm = newValue;
    }

    public get wordDefinition()
    {
        return this.wordDef;
    }

    //Public methods
    public ConstructResult()
    {
        switch(this._type)
        {
            case OpenArabDictWordType.Adjective:
            case OpenArabDictWordType.Noun:
            case OpenArabDictWordType.Numeral:
            case OpenArabDictWordType.Pronoun:
                {
                    if(this._isMale === undefined)
                        this.ReportValidationError("Gender is missing");
                    if(this._text === undefined)
                        this.ReportValidationError("Text is missing");
                }
        }

        return {
            type: this.type,
            text: this._text,
            isMale: this._isMale
        };
    }

    public Infer<T extends InferableValue>(variable: "isMale" | "text" | "type", allowedValues: T[], defaultValue: T)
    {
        const got = (this as any)["_" + variable];
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
            (this as any)["_" + variable] = defaultValue;
            return;
        }

        console.log(got, allowedValues);
        throw new Error("Variable '" + variable + "' has illegal value. Trace: " + this.TraceToString());
    }

    //Private methods
    private ReportRedundancy(variable: string, defaultValue: InferableValue)
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
            case "verb":
            {
                const parentTrace = this.TraceNodeToString(node.parent);
                parentTrace.push("VERB: " + node.verbId);
                return parentTrace;
            }
            case "word":
                const parentTrace = this.TraceNodeToString(node.parent);
                parentTrace.push(node.word.text);
                return parentTrace;
            case "word-collection":
                return ["file: " + node.fileName];
        }
    }

    private TraceToString()
    {
        const traces = this.TraceNodeToString(this._parent);
        if(("text" in this.wordDef) && (this.wordDef.text !== undefined))
            traces.push(this.wordDef.text);
        else
            console.log(this.wordDef);
        return traces.join(" --> ");
    }

    //State
    private _isMale?: boolean;
    private _text?: string;
    private _type?: OpenArabDictWordType;
    private _verbForm?: OpenArabDictVerbForm;
}