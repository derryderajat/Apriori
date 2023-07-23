export class AprioriAlgorithm {
  constructor(db, minSupport, minConfidence) {
    this.db = db;
    this.minSupport = minSupport;
    this.minConfidence = minConfidence;
    this.apriori = {
      rules: [],
    };
  }

  filterBySupport(itemFrequency) {
    const L1 = {};
    const n = this.db.length;

    for (const [itemId, frequency] of Object.entries(itemFrequency)) {
      if (frequency / n >= this.minSupport) {
        L1[itemId] = frequency;
      }
    }

    return L1;
  }

  generateCombinations(currentCombination, startIndex, remainingSize) {
    const Cn = [];
    const L1Keys = Object.keys(this.apriori["L1"]);

    if (remainingSize === 0) {
      Cn.push(currentCombination);
      return Cn;
    }

    for (let i = startIndex; i <= L1Keys.length - remainingSize; i++) {
      const newCombination = [...currentCombination, L1Keys[i]];
      const remaining = remainingSize - 1;
      const nextIndex = i + 1;

      Cn.push(
        ...this.generateCombinations(newCombination, nextIndex, remaining)
      );
    }

    return Cn;
  }

  generateRules(entries, latestLargeItemSet, L1) {
    const rules = [];
    const n = this.db.length;

    for (let i = 0; i < entries.length; i++) {
      const temp = {};
      const consequent = entries[i][0]
        .split(",")
        .at(-1)
        .replace(/'/g, "")
        .trim();
      const parts = entries[i][0].split(",");
      let antecedent = parts.slice(0, -1).join(",").replace(/'/g, "").trim();
      const supportAntecedent = latestLargeItemSet[antecedent];
      const supportConsequent = L1[consequent];
      const supportItem = entries[i][1];

      if (supportItem / supportAntecedent >= this.minConfidence) {
        temp["_id"] = new ObjectId();
        temp["antecedents"] = antecedent;
        temp["consequents"] = consequent;
        temp["antecedent support"] = supportAntecedent;
        temp["consequent support"] = supportConsequent;
        temp["support"] = supportItem;
        temp["confidence"] = (supportItem / supportAntecedent) * 100;
        temp["lift"] =
          supportItem / n / (((supportAntecedent / n) * supportConsequent) / n);
        temp["leverage"] =
          supportItem / n - (supportAntecedent / n) * (supportConsequent / n);
        temp["conviction"] =
          (1 - supportConsequent / n) / (1 - temp["confidence"] / 100);
        temp["createdAt"] = new Date();
        rules.push(temp);
      }
    }

    return rules;
  }

  generateApriori() {
    const n = this.db.length;
    const C1 = this.db
      .flatMap((arr) => arr)
      .reduce((frequency, name) => {
        frequency[name] = (frequency[name] || 0) + 1;
        return frequency;
      }, {});

    const L1 = this.filterBySupport(C1);
    this.apriori["C1"] = C1;
    this.apriori["L1"] = L1;

    let count = 2;
    while (true) {
      const joinItemSets = this.generateCombinations(
        Object.keys(this.apriori["L1"]),
        count
      );
      const candidates = this.getCombination(this.db, joinItemSets);
      const largeItemSets = this.filterBySupport(candidates);
      this.apriori["J" + count] = joinItemSets;
      this.apriori["C" + count] = candidates;
      this.apriori["L" + count] = largeItemSets;

      if (Object.keys(largeItemSets).length <= 1) {
        break;
      } else {
        const entries = Object.entries(this.apriori["L" + count]);
        const rules = this.generateRules(
          entries,
          this.apriori["L" + (count - 1)],
          L1
        );
        this.apriori.rules = this.apriori.rules.concat(rules);

        count++;
      }
    }

    return this.apriori;
  }
}
