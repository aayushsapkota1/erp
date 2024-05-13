const getPaginatedData = async ({
  page,
  limit,
  modelName,
  inside,
  mainSearch = { name: "", value: "" },
  filterBy = { name: "", value: "" },
  sortBy = { createdAt: -1 },
  oneAndCondition = [],
  startDate = "",
  endDate = "",
}) => {
  try {
    const skip = (page - 1) * limit;
    let match = {};
    if (inside.length > 0) {
      match.$or = inside;
    }
    if (oneAndCondition.length > 0) {
      match.$and = oneAndCondition;
    }
    if (mainSearch.name) {
      match[mainSearch.name] = mainSearch.value;
    }
    if (filterBy.name) {
      match[filterBy.name] = filterBy.value;
    }
    if (startDate) {
      match.createdDate = { $gte: startDate };
    }
    if (endDate) {
      if (match.createdDate) {
        match.createdDate.$lte = endDate;
      } else {
        match.createdDate = { $lte: endDate };
      }
    }
    const [filterValue, total] = await Promise.all([
      modelName.aggregate([
        { $match: match },
        { $sort: sortBy },
        { $skip: skip },
        { $limit: limit },
      ]),
      modelName.countDocuments(match),
    ]);
    const pageCount = Math.ceil(total / limit);
    return { data: filterValue, pageCount };
  } catch (err) {
    return { data: [], pageCount: 0 };
  }
};

module.exports = { getPaginatedData };