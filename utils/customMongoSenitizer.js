export const customMongoSanitize = (req, res, next) => {
  const sanitize = (obj) => {
    if (!obj || typeof obj !== "object") return;

    Object.keys(obj).forEach((key) => {
      const value = obj[key];

      let newKey = key;

      // Key sanitize

      if (key.startsWith("$") || key.includes(".")) {
        newKey = key.replace(/\$/g, "_").replace(/\./g, "_");
        obj[newKey] = value;
        if (newKey !== key) delete obj[key];
      }

      // Value sanitize (sadece string tipinde)
      // TODO: Daha sonra daha güvenli yapı için app de kullanılan modeller içerisinde metin içinde . ve $ geçebilecek fieldler (value.includes(".") && newKey !== "email") mantıksal önermesine && ile eklenerek devreye alınabilir. Böylece value sanitization da yapılmış olur.
      //   if (
      //     typeof value === "string" &&
      //     (value.startsWith("$") || (value.includes(".") && newKey !== "email"))
      //   ) {
      //     obj[newKey] = value.replace(/\$/g, "_").replace(/\./g, "_");
      //   }

      // Rekürsif sanitize (nested objects / arrays)
      if (typeof obj[newKey] === "object") {
        sanitize(obj[newKey]);
      }
    });
  };

  ["body", "params"].forEach((target) => sanitize(req[target]));
  next();
};
