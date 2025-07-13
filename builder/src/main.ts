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
import fs from "fs";
import path from "path";
import YAML from 'yaml';
import { DBBuilder } from "./DBBuilder";
import { DialectMapper } from "./DialectMapper";
import { OpenArabDictDocument, OpenArabDictVerb, OpenArabDictVerbDerivationType, OpenArabDictWordParentType, OpenArabDictWordRelationshipType, OpenArabDictWordType } from "openarabdict-domain";
import { ProcessWordDefinition } from "./WordProcessor";
import { WordDefinition } from "./DataDefinitions";
import { Letter } from "openarabicconjugation/dist/Definitions";

interface DialectDefinition
{
    key: string;
    name: string;
    emojiCodes: string;
    iso639code: string;
    glottoCode: string;
    children?: DialectDefinition[];
}

interface RootDefinition
{
    radicals: string;
    ya?: boolean;
    words: WordDefinition[];
}

interface WordReference
{
    text: string;
}

interface WordRelationshipDefinition
{
    word1: WordReference;
    word2: WordReference;
    relationship: "synonym";
}

interface Catalog
{
    dialects: DialectDefinition[];
    relations: WordRelationshipDefinition[];
    roots: RootDefinition[];
    words: WordDefinition[];
}

async function CollectFiles(catalog: Catalog, dirPath: string)
{
    function ReadContent(content: string, ext: string)
    {
        switch(ext)
        {
            case "yml":
                return YAML.parse(content);
            default:
                throw new Error("Unsupported extension: " + ext);
        }
    }

    const children = await fs.promises.readdir(dirPath);
    for (const child of children)
    {
        const childPath = path.join(dirPath, child);
        const result = await fs.promises.stat(childPath);
        if(result.isDirectory())
            await CollectFiles(catalog, childPath);
        else
        {
            const content = await fs.promises.readFile(childPath, "utf-8");
            const data = ReadContent(content, childPath.substring(childPath.length - 3));
            if(data.dialects !== undefined)
                catalog.dialects.push(...data.dialects);
            if(data.relations !== undefined)
                catalog.relations.push(...data.relations);
            if(data.root !== undefined)
                catalog.roots.push(data.root);
            if(data.words !== undefined)
                catalog.words.push(...data.words);
        }
    }
}

function ProcessDialects(dialects: DialectDefinition[], parentId: number | null, builder: DBBuilder, dialectMapper: DialectMapper)
{
    for (const dialect of dialects)
    {
        const id = builder.AddDialect(dialect.key, dialect.name, dialect.emojiCodes, dialect.glottoCode, dialect.iso639code, parentId);
        dialectMapper.CreateMappingIfPossible(id, dialect.glottoCode, dialect.iso639code);

        if(dialect.children !== undefined)
            ProcessDialects(dialect.children, id, builder, dialectMapper);
    }
}

function ResolveWordReference(ref: WordReference, builder: DBBuilder)
{
    const wordId = builder.FindWord({
        text: ref.text
    });
    return wordId;
}

async function BuildDatabase(dbSrcPath: string)
{
    const catalog: Catalog = {
        dialects: [],
        relations: [],
        roots: [],
        words: []
    };
    await CollectFiles(catalog, dbSrcPath);

    const builder = new DBBuilder;
    const dialectMapper = new DialectMapper;

    ProcessDialects(catalog.dialects, null, builder, dialectMapper);

    for (const root of catalog.roots)
    {
        const rootId = builder.AddRoot(root.radicals, root.ya);

        for (const word of root.words)
        {
            ProcessWordDefinition(word, builder, dialectMapper, {
                type: "root",
                rootId,
            });
        }
    }

    for (const word of catalog.words)
    {
        ProcessWordDefinition(word, builder, dialectMapper);
    }

    for (const relation of catalog.relations)
    {
        const word1Id = ResolveWordReference(relation.word1, builder);
        const word2Id = ResolveWordReference(relation.word2, builder);
        const type = (relation.relationship === "synonym") ? OpenArabDictWordRelationshipType.Synonym : OpenArabDictWordRelationshipType.Antonym;

        builder.AddRelation(word1Id, word2Id, type);
    }

    await builder.Store("./dist/db.json");
    await CheckWords("./dist/db.json");
}

const dbSrcPath = process.argv[2];
BuildDatabase(dbSrcPath);

async function CheckWords(dbPath: string)
{
    const data = await fs.promises.readFile(dbPath, "utf-8");
    const doc = JSON.parse(data) as OpenArabDictDocument;

    for (const word of doc.words)
    {
        //test: arb/assimilated/stem1_type_sound.js
        if((word.parent?.type === OpenArabDictWordParentType.Verb) && (word.parent.derivation === OpenArabDictVerbDerivationType.ActiveParticiple))
        {
            const verbId = word.parent.verbId;
            const verb = doc.words.find(x => x.id === verbId) as OpenArabDictVerb;
            const root = doc.roots.find(x => x.id === verb.rootId);

            if(root?.radicals.startsWith("و") && (verb.form.variants[0].stemParameters === "ia"))
            {
                console.log("FOUND", word);
            }
        }

        //test: arb/defective/stem1_r3waw_type3.js
        if((word.parent?.type === OpenArabDictWordParentType.Verb) && (word.parent.derivation === OpenArabDictVerbDerivationType.ActiveParticiple))
        {
            const verbId = word.parent.verbId;
            const verb = doc.words.find(x => x.id === verbId) as OpenArabDictVerb;
            const root = doc.roots.find(x => x.id === verb.rootId);

            if((root?.radicals === "ندو") && (verb.form.variants[0].stemParameters === "ia"))
            {
                console.log("FOUND", word);
            }
        }

        //test: arb/defective/stem10.js
        if((word.parent?.type === OpenArabDictWordParentType.Verb) && (word.parent.derivation === OpenArabDictVerbDerivationType.PassiveParticiple))
        {
            const verbId = word.parent.verbId;
            const verb = doc.words.find(x => x.id === verbId) as OpenArabDictVerb;
            const root = doc.roots.find(x => x.id === verb.rootId);
            const isDefective = (root?.radicals.endsWith("و")) || (root?.radicals.endsWith("ي"));

            if(isDefective && (verb.form.stem === 10))
            {
                console.log("FOUND", word);
            }
        }

        //test: arb/defective/stem3.js
        if((word.parent?.type === OpenArabDictWordParentType.Verb) && (word.parent.derivation === OpenArabDictVerbDerivationType.VerbalNoun))
        {
            const verbId = word.parent.verbId;
            const verb = doc.words.find(x => x.id === verbId) as OpenArabDictVerb;
            const root = doc.roots.find(x => x.id === verb.rootId);
            const isDefective = (root?.radicals.endsWith("و")) || (root?.radicals.endsWith("ي"));

            if(isDefective && (verb.form.stem === 3))
            {
                console.log("FOUND", word);
            }
        }

        //test: arb/defective/stem6.js
        if((word.parent?.type === OpenArabDictWordParentType.Verb) && (word.parent.derivation === OpenArabDictVerbDerivationType.VerbalNoun))
        {
            const verbId = word.parent.verbId;
            const verb = doc.words.find(x => x.id === verbId) as OpenArabDictVerb;
            const root = doc.roots.find(x => x.id === verb.rootId);
            const isDefective = (root?.radicals.endsWith("و")) || (root?.radicals.endsWith("ي"));

            if(isDefective && (verb.form.stem === 6))
            {
                console.log("FOUND", word);
            }
        }

        //test: arb/defective/stem7.js
        if((word.parent?.type === OpenArabDictWordParentType.Verb) && (word.parent.derivation === OpenArabDictVerbDerivationType.VerbalNoun))
        {
            const verbId = word.parent.verbId;
            const verb = doc.words.find(x => x.id === verbId) as OpenArabDictVerb;
            const root = doc.roots.find(x => x.id === verb.rootId);
            const isDefective = (root?.radicals.endsWith("و")) || (root?.radicals.endsWith("ي"));

            if(isDefective && (verb.form.stem === 7))
            {
                console.log("FOUND", word);
            }
        }

        //test: arb/doubly_weak/r1waw_r3waworya_stem4.js
        if((word.parent?.type === OpenArabDictWordParentType.Verb) && (word.parent.derivation === OpenArabDictVerbDerivationType.VerbalNoun))
        {
            const verbId = word.parent.verbId;
            const verb = doc.words.find(x => x.id === verbId) as OpenArabDictVerb;
            const root = doc.roots.find(x => x.id === verb.rootId);
            const startsWithWaw = (root?.radicals.startsWith("و"));
            const isDefective = (root?.radicals.endsWith("و")) || (root?.radicals.endsWith("ي"));

            if(startsWithWaw && isDefective && (verb.form.stem === 4))
            {
                console.log("FOUND", word);
            }
        }

        //test: arb/doubly_weak/r2ya_r3hamza.js
        if((word.parent?.type === OpenArabDictWordParentType.Verb) && (word.parent.derivation === OpenArabDictVerbDerivationType.VerbalNoun))
        {
            const verbId = word.parent.verbId;
            const verb = doc.words.find(x => x.id === verbId) as OpenArabDictVerb;
            const root = doc.roots.find(x => x.id === verb.rootId);
            const middleYa = (root?.radicals[1] === "ي");
            const endHamza = root?.radicals.endsWith("ء");

            if(middleYa && endHamza)
            {
                console.log("FOUND", word);
            }
        }

        //test: arb/hamza_on_r1/stem8.js
        if((word.parent?.type === OpenArabDictWordParentType.Verb) && (word.parent.derivation === OpenArabDictVerbDerivationType.VerbalNoun))
        {
            const verbId = word.parent.verbId;
            const verb = doc.words.find(x => x.id === verbId) as OpenArabDictVerb;
            const root = doc.roots.find(x => x.id === verb.rootId);
            const isHr1 = (root?.radicals.startsWith("ء"));

            if(isHr1 && (verb.form.stem === 8))
            {
                console.log("FOUND", word);
            }
        }

        //test: arb/hollow/stem1_ia.js
        if((word.parent?.type === OpenArabDictWordParentType.Verb) && (word.parent.derivation === OpenArabDictVerbDerivationType.PassiveParticiple))
        {
            const verbId = word.parent.verbId;
            const verb = doc.words.find(x => x.id === verbId) as OpenArabDictVerb;
            const root = doc.roots.find(x => x.id === verb.rootId);
            const isHollow = root?.radicals[1] === Letter.Waw;

            if(isHollow && (verb.form.stem === 1) && (verb.form.variants[0].stemParameters === "ia"))
            {
                console.log("FOUND", word);
            }
        }

        //test: arb/r2doubled/stem1_type_ia.js
        if((word.parent?.type === OpenArabDictWordParentType.Verb) && (word.parent.derivation === OpenArabDictVerbDerivationType.VerbalNoun))
        {
            const verbId = word.parent.verbId;
            const verb = doc.words.find(x => x.id === verbId) as OpenArabDictVerb;
            const root = doc.roots.find(x => x.id === verb.rootId)!;

            if((verb.form.stem === 1) && (root.radicals[1] === root.radicals[2]) && (verb.form.variants[0].stemParameters === "ia") && (root.radicals[0] !== "و"))
            {
                console.log("FOUND", word);
            }
        }

        //test: arb/r2doubled/stem3.js
        if((word.parent?.type === OpenArabDictWordParentType.Verb) && (word.parent.derivation === OpenArabDictVerbDerivationType.VerbalNoun))
        {
            const verbId = word.parent.verbId;
            const verb = doc.words.find(x => x.id === verbId) as OpenArabDictVerb;
            const root = doc.roots.find(x => x.id === verb.rootId)!;
            const isr2d = root.radicals[1] === root.radicals[2];

            if((verb.form.stem === 3) && isr2d)
            {
                console.log("FOUND", word);
            }
        }

        //test: arb/r2doubled/stem6.js
        if((word.parent?.type === OpenArabDictWordParentType.Verb) && (word.parent.derivation === OpenArabDictVerbDerivationType.VerbalNoun))
        {
            const verbId = word.parent.verbId;
            const verb = doc.words.find(x => x.id === verbId) as OpenArabDictVerb;
            const root = doc.roots.find(x => x.id === verb.rootId)!;
            const isr2d = root.radicals[1] === root.radicals[2];

            if((verb.form.stem === 6) && isr2d)
            {
                console.log("FOUND", word);
            }
        }

        //test: arb/r2doubled/stem7.js
        if((word.parent?.type === OpenArabDictWordParentType.Verb) && (word.parent.derivation === OpenArabDictVerbDerivationType.VerbalNoun))
        {
            const verbId = word.parent.verbId;
            const verb = doc.words.find(x => x.id === verbId) as OpenArabDictVerb;
            const root = doc.roots.find(x => x.id === verb.rootId)!;
            const isr2d = root.radicals[1] === root.radicals[2];

            if((verb.form.stem === 7) && isr2d)
            {
                console.log("FOUND", word);
            }
        }

        //test: arb/sound/stem1_ii.js
        if((word.parent?.type === OpenArabDictWordParentType.Verb) && (word.parent.derivation === OpenArabDictVerbDerivationType.VerbalNoun))
        {
            const verbId = word.parent.verbId;
            const verb = doc.words.find(x => x.id === verbId) as OpenArabDictVerb;
            const root = doc.roots.find(x => x.id === verb.rootId)!;
            const isSound = !(root.radicals.includes("و")) && !(root.radicals.includes("ي"));

            if((verb.form.stem === 1) && (verb.form.variants[0].stemParameters === "ii") && isSound)
            {
                console.log("FOUND", word);
            }
        }

        //test: arb/sound/stem7.js
        if((word.parent?.type === OpenArabDictWordParentType.Verb) && (word.parent.derivation === OpenArabDictVerbDerivationType.ActiveParticiple))
        {
            const verbId = word.parent.verbId;
            const verb = doc.words.find(x => x.id === verbId) as OpenArabDictVerb;
            const root = doc.roots.find(x => x.id === verb.rootId)!;
            const isSound = !(root.radicals.includes("و")) && !(root.radicals.includes("ي"));

            if((verb.form.stem === 7) && isSound)
            {
                console.log("FOUND", word);
            }
        }

        //test: arb/sound/stem9.js
        if((word.parent?.type === OpenArabDictWordParentType.Verb) && (word.parent.derivation === OpenArabDictVerbDerivationType.VerbalNoun))
        {
            const verbId = word.parent.verbId;
            const verb = doc.words.find(x => x.id === verbId) as OpenArabDictVerb;
            const root = doc.roots.find(x => x.id === verb.rootId)!;
            const isSound = !(root.radicals.includes("و")) && !(root.radicals.includes("ي"));

            if((verb.form.stem === 9) && isSound)
            {
                console.log("FOUND", word);
            }
        }

        //test: arb/specially_irregular/hamza_r1_irregular_imperative.js
        if((word.parent?.type === OpenArabDictWordParentType.Verb) && (word.parent.derivation === OpenArabDictVerbDerivationType.VerbalNoun))
        {
            const verbId = word.parent.verbId;
            const verb = doc.words.find(x => x.id === verbId) as OpenArabDictVerb;
            const root = doc.roots.find(x => x.id === verb.rootId)!;

            if((verb.form.stem === 1) && (root.radicals === "ءخذ"))
            {
                console.log("FOUND", word);
            }
        }

        //test: arb/specially_irregular/hamza_r1_irregular_imperative.js
        if((word.parent?.type === OpenArabDictWordParentType.Verb) && (word.parent.derivation === OpenArabDictVerbDerivationType.VerbalNoun))
        {
            const verbId = word.parent.verbId;
            const verb = doc.words.find(x => x.id === verbId) as OpenArabDictVerb;
            const root = doc.roots.find(x => x.id === verb.rootId)!;

            if((verb.form.stem === 1) && (root.radicals === "ءكل"))
            {
                console.log("FOUND", word);
            }
        }

        //test: arb/specially_irregular/special_r-a-y.js
        if((word.parent?.type === OpenArabDictWordParentType.Verb) && (word.parent.derivation === OpenArabDictVerbDerivationType.VerbalNoun))
        {
            const verbId = word.parent.verbId;
            const verb = doc.words.find(x => x.id === verbId) as OpenArabDictVerb;
            const root = doc.roots.find(x => x.id === verb.rootId)!;

            if((verb.form.stem === 4) && (root.radicals === "رءي"))
            {
                console.log("FOUND", word);
            }
        }
    }
}
