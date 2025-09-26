"use strict";

export default class APIFeatures {
  constructor(query, queryString, defaultSortBy, allowedPopulatePaths) {
    this.query = query;
    this.queryString = queryString;
    this.defaultSortBy = defaultSortBy;
    this.allowedPopulatePaths = allowedPopulatePaths;
  }

  filter() {
    if (this.queryString.filter) {
      try {
        const parsedFilter = JSON.parse(this.queryString.filter);
        this.query = this.query.find(parsedFilter);
        this.filterQuery = parsedFilter;
        return this;
      } catch (err) {
        console.error("Invalid JSON in filter parameter", err);
        throw new Error("Invalid filter parameter format");
      }
    }

    let queryObj = JSON.parse(
      JSON.stringify(this.queryString).replace(
        /\b(gt|gte|lt|lte|eq|regex)\b/g,
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

    const queryEntires = Object.entries(queryObj);

    const orGroups = [];
    const andGroups = [];

    for (const [key, value] of queryEntires) {
      if (typeof value === "string" && value.includes("|")) {
        const orGroup = value.split("|").map((val) => ({ [key]: val }));
        orGroups.push({ $or: orGroup });
      } else if (value && typeof value === "object" && "$regex" in value) {
        andGroups.push({ [key]: { ...value, $options: "i" } });
      } else {
        andGroups.push({ [key]: value });
      }
    }

    const finalFilter =
      [...orGroups, ...andGroups].length > 0
        ? { $and: [...orGroups, ...andGroups] }
        : {};

    this.query = this.query.find(finalFilter);
    this.filterQuery = finalFilter;

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

  populateFields() {
    if (this.queryString.populate) {
      const populateArr = this.queryString.populate.split(";").map((entry) => {
        const [path, fields] = entry.split(":");
        if (!(path in this.allowedPopulatePaths)) return null;
        const safeFields = fields
          ? fields
              .split(",")
              .filter((f) => this.allowedPopulatePaths[path].includes(f))
              .join(" ")
          : this.allowedPopulatePaths[path].join(" ");
        return {
          path: path.trim(),
          select: safeFields.trim(),
        };
      });

      populateArr.filter(Boolean).forEach((pop) => {
        this.query = this.query.populate(pop);
      });
    }
    return this;
  }
}
