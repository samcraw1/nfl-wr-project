const hash = (player_display_name, size) => {
    let hashValue = 0;

    for( let index = 0; index < player_display_name.length; index++ ){
        hashValue = hashValue * 31 + player_display_name.charCodeAt(index);
    }

    return hashValue % size;
}

class HashTable{
    constructor(size = 20){
        this.size = size;
        this.buckets = Array(this.size);

        for(let i = 0; i < this.buckets.length; i++ ){
            this.buckets[i] = new Map();
        }
    }

    // key: player_display_name, value: the WR's season_rankings row
    insert(player_display_name, row){
        let index = hash(player_display_name, this.size)
        this.buckets[index].set(player_display_name, row)
    }

    remove(player_display_name){
        let index = hash(player_display_name, this.size)
        let deleted = this.buckets[index].get(player_display_name)
        this.buckets[index].delete(player_display_name)
        return deleted
    }

    search(player_display_name){
        let index = hash(player_display_name, this.size)
        return this.buckets[index].get(player_display_name)

    }
}
