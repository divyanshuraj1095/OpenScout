export function classifyDifficulty(labels : string[]){
    const beginnerLabels = ["good first issue", "beginner", "easy"];
    
    for(const label of labels){
        if(beginnerLabels.includes(label.toLowerCase())){
            return "Beginner";
        }
    }

    return "Intermediate";
}