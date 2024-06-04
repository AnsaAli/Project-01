const Order = require('../models/orderModel');
const excel = require('exceljs');
const UserAuth = require('../models/userAuthenticationModel');
const moment = require("moment-timezone");
const PDFDocument = require('pdfkit');

const loadSales = async (req, res) => {
  try {
    console.log('============loadSales 1');
    let from = req.query.from ? moment.utc(req.query.from) : "ALL";
    let to = req.query.to ? moment.utc(req.query.to) : "ALL";

    console.log('from: ', from);
    console.log('to: ', to);

    // Pagination parameters
    const page = parseInt(req.query.page) || 1;  // Current page number
    const limit = 3;  // Number of items per page

    console.log('============loadSales 2');

    // Sort by descending createdAt
    const orderPlaced = await Order.find({})
      .populate('shippingAddress')
      .populate('orderItems')
      .populate('user_id');
    console.log('============loadSales 3', orderPlaced);

    let orderdetails = [];
    let count = 0;

    if (from !== "ALL" && to !== "ALL") {
      console.log('Applying date filter');

      orderdetails = await Order.aggregate([
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

      console.log('Filtered orders: ', orderdetails);

      count = await Order.countDocuments({
        orderDate: {
          $gte: new Date(from),
          $lte: new Date(to.endOf("day"))
        },
        orderStatus: {
          $nin: ["cancelled", "returned"]
        }
      });

    } else {
      console.log('No date filter applied');

      orderdetails = await Order.find({
        orderStatus: { $nin: ["cancelled", "returned"] }
      }).sort({ _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit);

      console.log('All orders: ', orderdetails);

      count = await Order.countDocuments({
        orderStatus: { $nin: ["cancelled", "returned"] }
      });
    }

    console.log('============loadSales 4 ', orderdetails);

    const totalPages = Math.ceil(count / limit);
    req.session.Orderdtls = orderdetails;
    console.log('============loadSales 5', count, totalPages);

    res.render("viewSales", {
      orderPlaced,
      message: orderdetails,
      from,
      to,
      currentPage: page,
      totalPages
    });
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
    console.log('Orderdtls: ', Orderdtls);

    // Generate Excel report
    if (req.query.format === 'excel') {
      const workbook = new excel.Workbook();
      const worksheet = workbook.addWorksheet('Sales Report');

      worksheet.columns = [
        { header: 'User', key: 'user', width: 20 },
        { header: 'Date', key: 'orderDate', width: 20 },
        { header: 'Payment Method', key: 'paymentMethod', width: 20 },
        { header: 'Total Amount', key: 'finalPrice', width: 20 },
        { header: 'Status', key: 'orderStatus', width: 20 },
      ];

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

      worksheet.addRows(rows);

      const fileName = 'sales_report.xlsx';
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);

      await workbook.xlsx.write(res);
      res.end();

      // Generate PDF report
    } else if (req.query.format === 'pdf') {
      const doc = new PDFDocument();
      const fileName = 'sales_report.pdf';
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);

      doc.pipe(res);

      doc.fontSize(16).text('Sales Report', { align: 'center' });
      doc.moveDown();

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

      rows.forEach(row => {
        doc.fontSize(12).text(`User: ${row.user}`);
        doc.fontSize(12).text(`Date: ${row.orderDate}`);
        doc.fontSize(12).text(`Payment Method: ${row.paymentMethod}`);
        doc.fontSize(12).text(`Total Amount: ₹${row.finalPrice}`);
        doc.fontSize(12).text(`Status: ${row.orderStatus}`);
        doc.moveDown();
      });

      doc.end();
    } else {
      res.status(400).json({ message: 'Invalid format' });
    }
  } catch (error) {
    console.log('Error while downloading sales report', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

const dailySales = async (req, res) => {
  try {
    console.log('============================================in dailySales')
    let orderDate = req.body.daily;
    console.log('orderDate: ', orderDate)
    const formattedDate = moment(orderDate, ['YYYY-MM-DD', 'MM-DD-YYYY', 'DD-MM-YYYY'], true);
    if (!formattedDate.isValid()) {
      return res.status(400).json({ error: "Invalid date format. Please provide date in YYYY-MM-DD format." });
    }
    orderDate = formattedDate.format('YYYY-MM-DD');

    const startDate = moment(orderDate).startOf('day').toDate();
    const endDate = moment(orderDate).endOf('day').toDate();

    const page = parseInt(req.query.page) || 1;
    const perPage = 5; // Number of items per page

    // Fetch daily orders with pagination
    const dailyorders = await Order.find({
      orderDate: {
        $gte: startDate,
        $lte: endDate
      }
    })
      .populate('shippingAddress')
      .populate('orderItems')
      .populate('user_id')
      .skip((page - 1) * perPage)
      .limit(perPage);

    // Calculate total order bill
    const totalOrderBill = dailyorders.reduce(
      (total, order) => total + Number(order.totalAmount),
      0
    );

    // Count total number of orders for pagination
    const totalOrdersCount = await Order.countDocuments({
      orderDate: {
        $gte: startDate,
        $lte: endDate
      }
    });

    const totalPages = Math.ceil(totalOrdersCount / perPage);

    res.render('dailysales', {
      dailyorders,
      totalOrderBill,
      currentPage: page,
      totalPages,
      orderDate
    });
  } catch (error) {
    console.log('Error dailySales', error);
    res.status(500).send('Internal Server Error');
  }
}


const dailyDownload = async (req, res) => {
  try {
    console.log('=========================================================dailyDownload');
    const orderDate = req.query.date;
    const format = req.query.format; // Extract the format from the query string
    console.log('orderDate: ', orderDate);
    const parsedDate = moment(orderDate, 'YYYY-MM-DD', true); // Parse date using moment.js
    console.log('parsedDate: ', parsedDate);

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

    if (format === 'excel') {
      // Create a new Excel workbook and worksheet
      const workbook = new excel.Workbook();
      const worksheet = workbook.addWorksheet('Sales Data');

      // Define the columns in the worksheet
      worksheet.columns = [
        { header: 'Order ID', key: 'order_id', width: 10 },
        { header: 'A/c Holder Name', key: 'deliveryName', width: 20 },
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

    } else if (format === 'pdf') {
     // Create a new PDF document
     const doc = new PDFDocument();
     let buffers = [];
     doc.on('data', buffers.push.bind(buffers));
     doc.on('end', () => {
       let pdfData = Buffer.concat(buffers);
       res.setHeader('Content-Type', 'application/pdf');
       res.setHeader('Content-Disposition', 'attachment; filename=DailySalesReport.pdf');
       res.send(pdfData);
     });

     // Add content to the PDF document
     doc.fontSize(20).text('Daily Sales Report', { align: 'center' });
     doc.fontSize(12).text(`Date: ${parsedDate.format('YYYY-MM-DD')}`);
     doc.moveDown();

     // Table headers
    //  const tableHeaders = ['Order ID', 'A/c Holder Name', 'Order Date', 'Discount', 'Total Bill'];
     const tableHeaders = ['Order ID', 'A/c Holder Name', 'Order Date', 'Total Bill'];
     const columnXPositions = [50, 150, 280, 400, 470];
     doc.fontSize(10);
     tableHeaders.forEach((header, i) => {
       doc.text(header, columnXPositions[i], doc.y);
     });

     // Fetch users' names before adding table rows
     const rows = await Promise.all(dailyorders.map(async order => {
       const user = await UserAuth.findById(order.user_id).select('name');
       return {
         order_id: order.order_id,
         deliveryName: order.shippingAddress.address_customer_name,
         orderDate: order.orderDate.toDateString(),
        //  discountAmount: order.discountAmount,
         finalPrice: order.finalPrice,
       };
     }));

     // Add a line under headers
     doc.moveDown(0.5);
     doc.text('-----------------------------------------------------------------------------------------------------------------------------------', 50, doc.y);

     // Table rows
     rows.forEach(row => {
       doc.moveDown(0.5); // Move down before writing each row
       Object.keys(row).forEach((key, i) => {
         doc.text(row[key], columnXPositions[i], doc.y, { continued: i < Object.keys(row).length - 1 });
       });
     });

     doc.moveDown();
     doc.fontSize(14).text(`Total Order Bill: ${totalOrderBill}`, { align: 'right' });

     // Finalize the PDF and end the stream
     doc.end();
    } else {
      res.status(400).json({ error: 'Invalid format. Please select either "excel" or "pdf".' });
    }
   
  } catch (error) {
    console.log('Error dailyDownload', error)
  }
}

const monthlysales = async (req, res) => {
  try {
    console.log('===================in monthlysales')
    const monthinput = req.body?.month;
    console.log('monthinput: ',monthinput)
    const year = parseInt(monthinput.substring(0, 4));
    const month = parseInt(monthinput.substring(5));

    const startDate = new Date(year, month - 1, 1, 0, 23, 59, 59, 999);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    // Pagination parameters
    const page = parseInt(req.query.page) || 1;
    const perPage = 5;

    // Fetch monthly orders based on validated dates with pagination
    const skip = (page - 1) * perPage;
    const monthlyOrders = await Order.find({
      orderDate: {
        $gt: startDate,
        $lte: endDate,
      },
      orderStatus: { $in: ['Success', 'Placed'] } // Filter by status
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
      orderStatus: { $in: ['Success', 'Placed'] }
    });
    const totalPages = Math.ceil(totalOrdersCount / perPage);

    const orderPlaced = await Order.find({}).populate('shippingAddress').populate('orderItems').populate('user_id');

    res.render("monthlyOrders", {
      orderPlaced,
      monthlyOrders,
      totalMonthlyBill,
      currentPage: page,
      totalPages,
      monthinput
    });
  } catch (error) {
    console.log('Error in monthlysales', error)
  }
}

const monthlyDownload = async (req, res) => {
  try {
    console.log('===================in monthlyDownload')
   const monthinput = req.query.month;
console.log('monthinput: ', monthinput);
const year = parseInt(monthinput.substring(0, 4));
const month = parseInt(monthinput.substring(5));

const startDate = new Date(year, month - 1, 1, 0, 0, 0);
const endDate = new Date(year, month, 0, 23, 59, 59, 999);

// Fetch monthly orders
const monthlyOrders = await Order.find({
  orderDate: {
    $gt: startDate,
    $lte: endDate,
  },
  orderStatus: { $in: ['Success', 'Placed'] } // Filter by status
}).sort({ date: 'desc' });

// Calculate total monthly bill
const totalMonthlyBill = monthlyOrders.reduce(
  (total, order) => total + Number(order.finalPrice),
  0
);

// Create a new PDF document
const doc = new PDFDocument();
let buffers = [];
doc.on('data', buffers.push.bind(buffers));
doc.on('end', () => {
  let pdfData = Buffer.concat(buffers);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename=MonthlySalesReport.pdf');
  res.send(pdfData);
});

// Add content to the PDF document
doc.fontSize(20).text('Monthly Sales Report', { align: 'center' });
doc.moveDown();
doc.fontSize(12).text(`Period: ${startDate.toDateString()} - ${endDate.toDateString()}`);
doc.moveDown();

// Table headers
doc.fontSize(10);
doc.text('Order ID', 50, doc.y, { width: 100, align: 'left', continued: true });
doc.text('Order Date', 150, doc.y, { width: 100, align: 'left', continued: true });
doc.text('Items', 250, doc.y, { width: 50, align: 'right', continued: true });
doc.text('Payment Method', 350, doc.y, { width: 100, align: 'left', continued: true });
doc.text('Shipping Status', 450, doc.y, { width: 100, align: 'left', continued: true });
doc.text('TOTAL BILL', 550, doc.y, { width: 100, align: 'right' });

// Table rows
monthlyOrders.forEach(order => {
  doc.moveDown();
  doc.fontSize(10);
  doc.text(order.order_id, 50, doc.y, { width: 100, align: 'left', continued: true });
  doc.text(order.orderDate.toDateString(), 150, doc.y, { width: 100, align: 'left', continued: true });
  doc.text(order.orderItems.length.toString(), 250, doc.y, { width: 50, align: 'right', continued: true });
  doc.text(order.paymentMethod, 350, doc.y, { width: 100, align: 'left', continued: true });
  doc.text(order.orderStatus, 450, doc.y, { width: 100, align: 'left', continued: true });
  doc.text(order.finalPrice.toString(), 550, doc.y, { width: 100, align: 'right' });
});

// Total monthly bill
doc.fontSize(14).text(`Total Monthly Bill: ${totalMonthlyBill}`, { align: 'right' });

// Finalize the PDF and end the stream
doc.end();

  } catch (error) {
    console.log('Error in monthlyDownload', error);
    res.status(500).send('An error occurred while generating the PDF file');
  }
}

const yearlyreport = async (req, res) => {
  try {
    console.log('===========================yearlysales')
    const year = req.body.yearly;
    console.log('year: ', year);

    const yearlyorders = await Order.find({
      orderDate: { $gte: new Date(`${year}-01-01`), $lte: new Date(`${year}-12-31`) }
    }).populate('user_id').populate('shippingAddress');
    console.log('yearlyorders: ', yearlyorders);

    const perPage = 5;
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