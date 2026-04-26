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

export enum OpenArabDictParentType
{
    /**
     * A word x has directed (outgoing) relations that has a target y.
     * The type describes the relationship.
     * Many relationships are parent-child relationships.
     */

    //Relation from x to y means: x is a direct child of root y.
    Root,

    //parent-child verb-only relationships
    //Relation from x to y means: x is the active participle of verb y.
    ActiveParticiple,
    //Relation from x to y means: x is the characteristic noun of verb y.
    CharacteristicNoun,
    //Relation from x to y means: x is related in meaning to verb y and is thus considered a direct child.
    MeaningRelated,
    //Relation from x to y means: x is the noun of place of verb y.
    NounOfPlace,
    //Relation from x to y means: x is the passive participle of verb y.
    PassiveParticiple,
    //Relation from x to y means: x is the tool noun of verb y.
    ToolNoun,
    //Relation from x to y means: x is the verbal noun of verb y.
    VerbalNoun,

    //parent(x) = y
    //Relation from x to y means: x is plural of y
    Plural,
    //Relation from x to y means: x is feminine version of male word y
    Feminine,
    //Relation from adjective x to noun y means: x is nisba of y
    Nisba,
    //Relation from x to y means: x is colloquial version of fus7a word y
    Colloquial,
    //Relation from x to y means: x is an extension of word y (for example taking a word to a further meaning in a phrase)
    Extension,
    //Relation from noun x to adjective y means: x is elative degree of y
    ElativeDegree,
    //Relation from x to y means: x is singulative of collective y
    Singulative,
    //Child is adverbial accusative of parent
    AdverbialAccusative,
    //Relation from x to y means: x is instance noun of verbal noun y
    InstanceNoun,
    //Relation from x to y means: x is the definite state of word y (i.e. adding the article al-)
    DefiniteState,

    //Relation from x to y means: x is a compound word (like a idafa) and is composed on word y.
    ComposedOf,
}

export interface OpenArabDictParent
{
    /**
     * In general the related lexical unit id.
     * If @member type is @constant OpenArabDictDirectionalRelationshipType.Root, then this is the root id.
     */
    id: string;
    type: OpenArabDictParentType;
}