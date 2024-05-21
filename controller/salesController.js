const Order = require('../models/orderModel');
const excel = require('exceljs');
const UserAuth = require('../models/userAuthenticationModel');
const moment = require("moment-timezone");


const loadSales = async (req, res) => {
  try {
    console.log('============loadSales 1');
    let from = req.query.from ? moment.utc(req.query.from) : "ALL";
    let to = req.query.to ? moment.utc(req.query.to) : "ALL";

    // Pagination parameters
    const page = parseInt(req.query.page) || 1;  // Current page number
    const limit = 3;  // Number of items per page

    console.log('============loadSales 2');

    // Sort by descending createdAt
    const orderPlaced = await Order.find({}).populate('shippingAddress').populate('orderItems').populate('user_id');
    console.log('============loadSales 3', orderPlaced);

    if (from !== "ALL" && to !== "ALL") {
      const orderdetails = await Order.aggregate([
        {
          $match: {
            orderDate: {
              $gte: new Date(from),
              $lte: new Date(to.endOf("day"))
            },
            orderStatus: {
              $nin: ["cancelled", "returned"]
            }
          }
        },
        {
          $sort: { _id: -1 }
        },
        {
          $skip: (page - 1) * limit
        },
        {
          $limit: limit
        }
      ]);
      console.log('============loadSales 4', orderdetails);

      // Total count of orders
      const count = await Order.countDocuments({
        orderDate: {
          $gte: new Date(from),
          $lte: new Date(to.endOf("day"))
        },
        orderStatus: {
          $nin: ["cancelled", "returned"]
        }
      });

      const totalPages = Math.ceil(count / limit);
      req.session.Orderdtls = orderdetails;
      console.log('============loadSales 5', count, totalPages);

      res.render("viewSales", {
        orderPlaced,
        message: orderdetails, from, to,
        currentPage: page, totalPages
      });
    } else {
      console.log('============loadSales in else');

      const orderdetails = await Order.find({
        orderStatus: { $nin: ["cancelled", "returned"] }
      }).sort({ _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit);
      console.log('============loadSales in else 1', orderdetails);

      const totalOrdersCount = await Order.countDocuments({
        orderStatus: {
          $nin: ["cancelled", "returned"]
        }
      });
      console.log('============loadSales in else 2', totalOrdersCount);

      const totalPages = Math.ceil(totalOrdersCount / limit);

      req.session.Orderdtls = orderdetails;
      res.render("viewSales", {
        orderPlaced,
        message: orderdetails,
        from, to, currentPage: page, totalPages
      });
    }
  } catch (error) {
    console.log('Error while loading loadSales', error);
    res.status(500).send('Internal Server Error');
  }
}

/////////////////////////////////////\\\\\\\\\\\\\\\\\\\\\\\\\

const downloadSalesReport = async (req, res) => {
  try {
    const userId = req.session.user_id;
    const { Orderdtls } = req.session;
    console.log('Orderdtls: ', Orderdtls)

    // Create a new Excel workbook and worksheet
    const workbook = new excel.Workbook();
    const worksheet = workbook.addWorksheet('Sales Report');

    // Define the columns in the worksheet
    worksheet.columns = [
      { header: 'User', key: 'user', width: 20 },
      { header: 'Date', key: 'orderDate', width: 20 },
      { header: 'Payment Method', key: 'paymentMethod', width: 20 },
      { header: 'Total Amount', key: 'finalPrice', width: 20 },
      { header: 'Status', key: 'orderStatus', width: 20 },
    ];

    // Add data to the worksheet
    const rows = await Promise.all(Orderdtls.map(async order => {
      const user = await UserAuth.findById(order.user_id).select('name');
      return {
        user: user ? user.name : 'Unknown User',
        orderDate: new Date(order.orderDate).toLocaleString(),
        paymentMethod: order.paymentMethod,
        finalPrice: order.finalPrice,
        orderStatus: order.orderStatus,
      };
    }));
    // Add data to the worksheet
    worksheet.addRows(rows);

    // Set response headers for file download
    const fileName = 'sales_report.xlsx';
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);

    // Stream the Excel content to the response
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.log('Error while downloading sales report', error);

  }
};

const dailySales = async (req, res) => {
  try {
    let orderDate = req.body.daily;
    const formattedDate = moment(orderDate, ['YYYY-MM-DD', 'MM-DD-YYYY', 'DD-MM-YYYY'], true);
    if (!formattedDate.isValid()) {
      return res.status(400).json({ error: "Invalid date format. Please provide date in YYYY-MM-DD format." });
    }
    orderDate = formattedDate.format('YYYY-MM-DD');

    const startDate = moment(orderDate).startOf('day').toDate();
    const endDate = moment(orderDate).endOf('day').toDate();
    const orderPlaced = await Order.find({}).populate('shippingAddress').populate('orderItems').populate('user_id');


    const page = req.query.page || 1;
    const perPage = 5; // Number of items per page

    const dailyorders = await Order.find({
      orderDate: {
        $gte: startDate,
        $lte: endDate
      }
    })
      .populate('shippingAddress')
      .skip((page - 1) * perPage)
      .limit(perPage);

    const totalOrderBill = dailyorders.reduce(
      (total, order) => total + Number(order.totalAmount),
      0
    );

    const totalOrdersCount = await Order.countDocuments({
      orderDate: {
        $gte: startDate,
        $lte: endDate
      }
    });

    const totalPages = Math.ceil(totalOrdersCount / perPage);

    res.render('dailysales', {
      orderPlaced,
      dailyorders,
      totalOrderBill,
      currentPage: page,
      totalPages,
      orderDate
    });
  } catch (error) {
    console.log('Error dailySales', error);
  }
}

const dailyDownload = async (req, res) => {
  try {
    const orderDate = req.query.date
    const parsedDate = moment(orderDate, 'YYYY-MM-DD', true); // Parse date using moment.js


    if (!parsedDate.isValid()) {
      return res.status(400).json({ error: 'Invalid date format' });
    }

    const startDate = parsedDate.startOf('day').toDate();
    const endDate = parsedDate.endOf('day').toDate();

    // Fetch daily orders from the database
    const dailyorders = await Order.find({
      orderDate: {
        $gte: startDate,
        $lte: endDate
      }
    }).populate('shippingAddress');

    // Calculate total order bill
    const totalOrderBill = dailyorders.reduce(
      (total, order) => total + Number(order.finalPrice),
      0
    );

    // Create a new Excel workbook and worksheet
    const workbook = new excel.Workbook();
    const worksheet = workbook.addWorksheet('Sales Data');

    // Define the columns in the worksheet
    worksheet.columns = [
      { header: 'Order ID', key: 'order_id', width: 10 },
      { header: 'Delivery Name', key: 'deliveryName', width: 20 },
      { header: 'Order Date', key: 'orderDate', width: 15 },
      { header: 'Discount', key: 'discountAmount', width: 10 },
      { header: 'Total Bill', key: 'finalPrice', width: 10 }
    ];

    // Add data to the worksheet
    const rows = await Promise.all(dailyorders.map(async order => {
      const user = await UserAuth.findById(order.user_id).select('name');
      return {
        order_id: order.order_id,
        deliveryName: user ? user.name : 'Unknown User',
        orderDate: order.orderDate,
        paymentMethod: order.paymentMethod,
        discountAmount: order.discountAmount,
        finalPrice: order.finalPrice,
      };
    }));

    // Add data to the worksheet
    worksheet.addRows(rows);

    // Set response headers for file download
    const fileName = 'DailySalesReport.xlsx';
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);

    // Stream the Excel content to the response
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.log('Error dailyDownload', error)
  }
}

const monthlysales = async (req, res) => {
  try {
    const monthinput = req.body?.month;
    const year = parseInt(monthinput.substring(0, 4));
    const month = parseInt(monthinput.substring(5));

    const startDate = new Date(year, month - 1, 1, 0, 23, 59, 59, 999);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    // Pagination parameters
    const page = parseInt(req.query.page) || 1;
    const perPage = 10;

    // Fetch monthly orders based on validated dates with pagination
    const skip = (page - 1) * perPage;
    const monthlyOrders = await Order.find({
      orderDate: {
        $gt: startDate,
        $lte: endDate,
      },
      orderStatus: ['Confirmed', 'placed'] // Filter by status
    }).sort({ date: 'desc' }).skip(skip).limit(perPage);

    totalMonthlyBill = monthlyOrders.reduce(
      (total, order) => total + Number(order.finalPrice),
      0
    );

    const totalOrdersCount = await Order.countDocuments({
      orderDate: {
        $gte: startDate,
        $lte: endDate,
      },
      orderStatus: 'placed'
    });
    const totalPages = Math.ceil(totalOrdersCount / perPage);

    const orderPlaced = await Order.find({}).populate('shippingAddress').populate('orderItems').populate('user_id');

    res.render("monthlyOrders", {
      orderPlaced,
      monthlyOrders,
      totalMonthlyBill,
      currentPage: page,
      totalPages
    });
  } catch (error) {
    console.log('Error in monthlysales', error)
  }
}

const monthlyDownload = async (req, res) => {

  try {
    const workbook = new excel.Workbook
    const worksheet = workbook.addWorksheet('Sales Data');
    // Add headers to the worksheet
    worksheet.columns = [
      { header: "Order ID", key: "order_id", width: 10 },
      { header: "Order Date", key: "orderDate", width: 15 },
      { header: "Discount", key: "discountAmount", width: 10 },
      { header: "Total Bill", key: "finalPrice", width: 10 },
      { header: "totalOrders", key: "totalOrders", width: 10 },
      { header: "totalRevenue", key: "totalRevenue", width: 20 },
    ];

    const monthlyOrders = await Order.find({
      orderDate: {
        $gt: startDate,
        $lte: endDate,
      },
      orderStatus: 'placed' // Filter by status
    }).sort({ date: 'desc' })

    monthlyOrders.forEach((order) => {
      worksheet.addRow({
        orderId: order.order_id,
        orderDate: order.orderDate,
        discount: order.discountAmount,
        totalBill: order.finalPrice,
      })
    })
    worksheet.addRow({
      totalOrders: monthlyOrders.length,
      totalRevenue: totalMonthlyBill,
    });
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=" + "SalesData.xlsx"
    );
    workbook.xlsx
      .write(res)
      .then(() => {
        res.end();
      })
      .catch((err) => {
        res.status(500).send("An error occurred while generating the Excel file");
      });
  } catch (error) {
    console.log('Error in monthlydownload', error)
  }
}

const yearlyreport = async (req, res) => {
  try {
    console.log('===========================yearlysales')
    const year = req.body.yearly;
    console.log('year: ', year);
    const yearlyorders = await Order.find({
      orderDate: { $gte: new Date(`${year}-01-01`), $lte: new Date(`${year}-12-31`) }
    });
    console.log('yearlyorders: ', yearlyorders);

    const perPage = 10;
    let currentPage = parseInt(req.query.page) || 1;
    const totalYearlyOrders = yearlyorders.length;
    const totalPages = Math.ceil(totalYearlyOrders / perPage);

    // Ensure currentPage is within valid range
    currentPage = currentPage < 1 ? 1 : currentPage;
    currentPage = currentPage > totalPages ? totalPages : currentPage;

    const startIndex = (currentPage - 1) * perPage;
    const endIndex = Math.min(startIndex + perPage, totalYearlyOrders);

    const paginatedOrders = yearlyorders.slice(startIndex, endIndex);

    totalYearlyBill = yearlyorders.reduce(
      (total, order) => total + Number(order.finalPrice),
      0
    );
    res.render("yearlyOrder", {
      yearlyorders: paginatedOrders,
      totalYearlyBill,
      currentPage,
      totalPages,
      year
    });
  } catch (error) {
    console.log('Error in yearlysales', error)
  }
}
/////////////////////////////////////////////////////
module.exports = {
  loadSales,
  downloadSalesReport,
  dailySales,
  dailyDownload,
  monthlysales,
  monthlyDownload,
  yearlyreport
}