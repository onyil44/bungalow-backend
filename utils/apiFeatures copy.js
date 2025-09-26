"use strict";

export default class APIFeatures {
  constructor(query, queryString, defaultSortBy) {
    this.query = query;
    this.queryString = queryString;
    this.defaultSortBy = defaultSortBy;
  }

  filter() {
    let queryObj = JSON.parse(
      JSON.stringify(this.queryString).replace(
        /\b(gt|gte|lt|lte|eq)\b/g,
        (match) => `$${match}`
      )
    );

    const excluedeFields = [
      "page",
      "sort",
      "limit",
      "fields",
      "lang",
      "populate",
    ];

    excluedeFields.forEach((el) => delete queryObj[el]);

    //DONE: Create query template to use and and or operator together.
    //?The above mentioned logic created blow, it needs to be tested based on diffirent scenarios.

    let orQueArr = [[]];

    const notOrQueArr = Object.entries(queryObj)
      .map((que) => {
        const orQue = que.filter((el) => el.includes?.("|"));
        if (orQue.length > 0) {
          const splittedOrQue = orQue
            .map((el) => el.split("|"))
            .flat(Infinity)
            .map((splQue) => {
              const splQueObj = {};
              splQueObj[que[0]] = splQue;
              return splQueObj;
            });
          orQueArr[0].push({ $or: splittedOrQue });

          return;
        }
        return que;
      })
      .filter((el) => el !== undefined);

    queryObj = Object.fromEntries([...orQueArr, ...notOrQueArr]);

    let regexQueryObj;

    if (
      Object.values(queryObj)
        .filter((el) => typeof el === "string")
        .some((el) => el.includes("regex"))
    ) {
      regexQueryObj = Object.fromEntries([
        Object.entries(queryObj)
          .find((el) => el[1].includes("regex"))
          .map((el) => {
            if (el.includes("regex"))
              return { $regex: el.replace("regex:", "") };
            return el;
          }),
      ]);
    }

    const notRegexQueryObj = Object.fromEntries(
      Object.entries(queryObj)
        .filter((el) => {
          return typeof el === "string";
        })
        .filter((el) => !el[1].includes("regex"))
    );

    this.filterQuery = queryObj;
    this.query = this.query.find(queryObj);

    if (notRegexQueryObj) {
      this.filterQuery = notRegexQueryObj;
      this.query = this.query.find(notRegexQueryObj);
    }
    if (regexQueryObj) {
      this.filterQuery = regexQueryObj;
      this.query = this.query.find(regexQueryObj);
    }
    return this;
  }

  sort() {
    if (this.queryString.sort) {
      const sortBy = this.queryString.sort.replaceAll(`,`, ` `);
      this.query = this.query.sort(sortBy);
    } else {
      this.query = this.query.sort(this.defaultSortBy);
    }
    return this;
  }

  limitFields() {
    if (this.queryString.fields) {
      const fields = this.queryString.fields.replaceAll(",", " ");
      this.query = this.query.select(fields);
    } else {
      this.query = this.query.select("-__v");
    }
    return this;
  }

  paginate() {
    const page = +this.queryString.page || 1;
    const limit = +this.queryString.limit || 100;
    const skip = (page - 1) * limit;
    this.query = this.query.skip(skip).limit(limit);
    return this;
  }
}
