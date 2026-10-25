// @ts-expect-error The JavaScript module has no declaration file.
import HashTable  from "@/lib/hashTable";
import { getCurrentWeekLeaders, getSeasonRankings } from "@/lib/db/reads";
import "dotenv/config";

// One item from table.searchPartial: the player's name plus their stats row.
type Entry = { name: string; row: { receiving_tds: number; week: number } };

const table = new HashTable();

for (const row of await getCurrentWeekLeaders(2026)){
    table.insert(row.player_display_name, row);
}

console.log(table.searchPartial("").map(({ name, row }: Entry) => ({ name, receiving_tds: row.receiving_tds, week: row.week })))



function wrsWithATd(entries: Entry[]){

    const moreThanOne = new Map();

    for(const { name, row} of entries){
        if(row.receiving_tds > 1){
            moreThanOne.set(name, row.receiving_tds)
        }
    }
    return moreThanOne;
}

const all = table.searchPartial("");
console.log(wrsWithATd(all));