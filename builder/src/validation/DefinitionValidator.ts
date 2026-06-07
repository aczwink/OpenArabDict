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
import { GlobalInjector } from "@aczwink/acts-util-node";
import { OpenArabDictGender, OpenArabDictPOSType } from "@aczwink/openarabdict-domain";
import { ArabicText } from "@aczwink/openarabicconjugation";
import { Buckwalter } from "@aczwink/openarabicconjugation/dist/Transliteration";
import { DisplayVocalized, ParseVocalizedText, VocalizedWordTostring } from "@aczwink/openarabicconjugation/dist/Vocalization";
import { StatisticsCounterService, StatisticsCounter } from "../services/StatisticsCounterService";
import { WordDefinition } from "../DataDefinitions";
import { TreeTrace, TreeTraceNodeType } from "../TreeTrace";

type ValueType = DisplayVocalized[] | string | OpenArabDictGender | OpenArabDictPOSType;

export abstract class DefinitionValidator<VariableType>
{
    constructor(protected wordDef: WordDefinition, private _sourceTreeTrace?: TreeTrace)
    {
    }

    //Properties
    public get _legacyWordDefinition()
    {
        return this.wordDef;
    }

    public get sourceTreeTrace()
    {
        return this._sourceTreeTrace;
    }

    //Protected abstract
    protected abstract Get(variable: VariableType): ValueType | undefined;
    protected abstract Set(variable: VariableType, value: ValueType): void;

    //Protected methods
    protected InferAnyOfImpl(variable: VariableType, allowedValues: ValueType[], defaultValue: ValueType)
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

    protected InferDefaultImpl(variable: VariableType, defaultValue: ValueType)
    {
        const got = this.Get(variable);
        if(got === undefined)
            this.Assign(variable, defaultValue);
        else
            this.CheckRedundancy(variable, defaultValue);
    }

    protected InferValueImpl(variable: VariableType, value: ValueType)
    {
        const got = this.Get(variable);
        if(got === undefined)
            this.Assign(variable, value);
        else if(this.Equals(variable, got, value))
            this.CheckRedundancy(variable, value);
        else
        {
            this.ReportValidationError("Variable '" + variable + "' has wrong value assigned. Got: " + this.ValueToValidationErrorString(got) + " Expected: " + this.ValueToValidationErrorString(value));
        }
    }

    protected ReportValidationError(message: string)
    {
        throw new Error(message + " Trace: " + this.TraceToString());
    }

    //Private methods
    private Assign(variable: VariableType, value: ValueType)
    {
        const alreadyAssigned = this.Get(variable);
        if((alreadyAssigned !== undefined) && this.Equals(variable, alreadyAssigned, value))
            this.ReportRedundancy(variable, value);

        this.Set(variable, value);
    }

    private CheckRedundancy(variable: VariableType, value: ValueType)
    {
        if(this.Equals(variable, this.Get(variable)!, value))
            this.ReportRedundancy(variable, value);
    }

    private Equals(variable: VariableType, got: ValueType, value: ValueType)
    {
        switch(variable)
        {
            case "text":
                return ArabicText.EqualsVocalized(ParseVocalizedText(got as string), Array.isArray(value) ? value : ParseVocalizedText(value as string));
        }
        return got === value;
    }

    private ReportRedundancy(variable: VariableType, defaultValue: ValueType)
    {
        const statsService = GlobalInjector.Resolve(StatisticsCounterService);
        statsService.Increment(StatisticsCounter.RedundantAssignment);
        console.log("Redundant assignment of variable '" + variable + "'. Trace: " + this.TraceToString());
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
}