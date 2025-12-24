import Year from "../models/yearModel.js";

export async function getLastYear(req, res) {
  try {
    const lastYear = await Year.getLastCreatedYear();

    if (!lastYear) {
      return res.status(404).json({
        success: false,
        message: "No academic years found",
      });
    }

    res.status(200).json({
      success: true,
      data: lastYear,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching last academic year",
      error: error.message,
    });
  }
}
