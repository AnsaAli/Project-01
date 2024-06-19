const Order = require('../models/orderModel');
const UserAddress = require('../models/addressModel');
const OrderItem = require('../models/orderItemModel');
const excel = require('exceljs');
const UserAuth = require('../models/userAuthenticationModel');
const moment = require("moment-timezone");
const PDFDocument = require('pdfkit');
const pdfMakePrinter = require('pdfmake/src/printer');
const path = require('path');

///////////////////////////////////\\\\\\\\\\\\\\\\\\\\\\\\\\\

const loadSales = async (req, res) => {
  try {
    console.log('============loadSales 1');
    let from = req.query.from ? moment.utc(req.query.from).startOf('day').toDate() : "ALL";
    let to = req.query.to ? moment.utc(req.query.to).endOf('day').toDate() : "ALL";

    console.log('from: ', from);
    console.log('to: ', to);

    // Pagination parameters
    const page = parseInt(req.query.page) || 1;  // Current page number
    const limit = 3;  // Number of items per page

    console.log('============loadSales 2');

    let orderdetails = [];
    let count = 0;

    if (from !== "ALL" && to !== "ALL") {
      console.log('Applying date filter');

      orderdetails = await Order.aggregate([
        {
          $match: {
            orderDate: {
              $gte: from,
              $lte: to
            },
            orderStatus: {
              $nin: ["cancelled", "Return Approved"]
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
        },
        {
          $lookup: {
            from: 'users',
            localField: 'user_id',
            foreignField: '_id',
            as: 'user'
          }
        },
        {
          $lookup: {
            from: 'useraddresses',
            localField: 'shippingAddress',
            foreignField: '_id',
            as: 'shippingAddress'
          }
        },
        {
          $unwind: '$shippingAddress'
        },
        {
          $lookup: {
            from: 'orderitems',
            localField: 'orderItems',
            foreignField: '_id',
            as: 'orderItems'
          }
        }
      ]).exec();

      console.log('Filtered orders: ', orderdetails);

      count = await Order.countDocuments({
        orderDate: {
          $gte: from,
          $lte: to
        },
        orderStatus: {
          $nin: ["cancelled", "Return Approved"]
        }
      });

    } else {
      console.log('No date filter applied');

      orderdetails = await Order.find({
        orderStatus: { $nin: ["cancelled", "Return Approved"] }
      }).sort({ _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('user_id')
        .populate('shippingAddress')
        .populate('orderItems');
      count = await Order.countDocuments({
        orderStatus: { $nin: ["cancelled", "Return Approved"] }
      });
    }

    console.log('============loadSales 4 ', orderdetails);

    const totalPages = Math.ceil(count / limit);
    req.session.Orderdtls = orderdetails;
    console.log('============loadSales 5', count, totalPages);

    res.render("viewSales", {
      message: orderdetails,
      from: req.query.from,
      to: req.query.to,
      currentPage: page,
      totalPages
    });
  } catch (error) {
    console.log('Error while loading loadSales', error);
    res.status(500).send('Internal Server Error');
  }
}


/////////////////////////////////////\\\\\\\\\\\\\\\\\\\\\\\\\

const fonts = {
  Roboto: {
    normal: path.join(__dirname, '..', 'font', 'Roboto-Regular.ttf'),
    bold: path.join(__dirname, '..', 'font', 'Roboto-Medium.ttf'),
    italics: path.join(__dirname, '..', 'font', 'Roboto-Italic.ttf'),
    bolditalics: path.join(__dirname, '..', 'font', 'Roboto-MediumItalic.ttf')
  }
};

const printer = new pdfMakePrinter(fonts);

const fetchOrderItems = async (orderItems) => {
  const items = await OrderItem.find({ _id: { $in: orderItems } }).populate('product_id', 'name');
  return items.map(item => {
    const productName = item.product_id ? item.product_id.name : 'Unknown Product';
    const orderedWeights = item.orderedWeight.map(ow => `${ow.name}: ${ow.weight}g`).join(', ');
    return `${productName} (${orderedWeights})`;
  }).join(', ');
};

const downloadSalesReport = async (req, res) => {
  try {
    const { Orderdtls } = req.session;
    console.log('Orderdtls: ', Orderdtls);

    // Fetch rows with user, address, and order items details
    const rows = await Promise.all(Orderdtls.map(async order => {
      const user = await UserAuth.findById(order.user_id).select('name');
      const address = await UserAddress.findById(order.shippingAddress).select('address_customer_name city pincode');
      const products = await fetchOrderItems(order.orderItems);

      return {
        user: user ? user.name : 'Unknown User',
        orderDate: new Date(order.orderDate).toLocaleString(),
        paymentMethod: order.paymentMethod,
        finalPrice: order.finalPrice,
        orderStatus: order.orderStatus,
        address: address ? `${address.address_customer_name}, ${address.city}, ${address.pincode}` : 'No Address',
        products
      };
    }));

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
        { header: 'Address', key: 'address', width: 30 },
        { header: 'Products', key: 'products', width: 50 }
      ];

      worksheet.addRows(rows);

      const fileName = 'sales_report.xlsx';
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);

      await workbook.xlsx.write(res);
      res.end();

      // Generate PDF report
    } else if (req.query.format === 'pdf') {
      const tableBody = [
        [
          { text: 'User', style: 'tableHeader' },
          { text: 'Date', style: 'tableHeader' },
          { text: 'Payment Method', style: 'tableHeader' },
          { text: 'Total Amount', style: 'tableHeader' },
          { text: 'Status', style: 'tableHeader' },
          { text: 'Address', style: 'tableHeader' },
          { text: 'Products', style: 'tableHeader' }
        ],
        ...rows.map(row => [
          row.user,
          row.orderDate,
          row.paymentMethod,
          `₹${row.finalPrice}`,
          row.orderStatus,
          row.address,
          row.products
        ])
      ];

      const docDefinition = {
        content: [
          { text: 'Sales Report', style: 'header', alignment: 'center' },
          { text: '\n\n' },
          {
            layout: 'lightHorizontalLines',
            table: {
              headerRows: 1,
              widths: ['*', 'auto', '*', '*', '*', '*', '*'],
              body: tableBody
            }
          }
        ],
        styles: {
          header: {
            fontSize: 16,
            bold: true
          },
          tableHeader: {
            bold: true,
            fontSize: 12,
            color: 'black'
          }
        }
      };

      const pdfDoc = printer.createPdfKitDocument(docDefinition);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=sales_report.pdf`);
      pdfDoc.pipe(res);
      pdfDoc.end();
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
      },
      orderStatus: {
        $nin: ["cancelled", "Return Approved"]
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
      },
      orderStatus: {
        $nin: ["cancelled", "Return Approved"]
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
      },
      orderStatus: {
        $nin: ["cancelled", "Return Approved"]
      }
    }).populate('shippingAddress');

    // Calculate total order bill
    const totalOrderBill = dailyorders.reduce(
      (total, order) => total + Number(order.finalPrice),
      0
    );

    const rows = await Promise.all(dailyorders.map(async order => {
      const user = await UserAuth.findById(order.user_id).select('name');
      const address = await UserAddress.findById(order.shippingAddress).select('address_customer_name city pincode');
      const products = await fetchOrderItems(order.orderItems);

      return {
        order_id: order.order_id,
        deliveryName: user ? user.name : 'Unknown User',
        orderDate: new Date(order.orderDate).toLocaleString(),
        paymentMethod: order.paymentMethod,
        discountAmount: order.discountAmount,
        finalPrice: order.finalPrice,
        address: address ? `${address.address_customer_name}, ${address.city}, ${address.pincode}` : 'No Address',
        products
      };
    }));

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
        { header: 'Total Bill', key: 'finalPrice', width: 10 },
        { header: 'Address', key: 'address', width: 30 },
        { header: 'Products', key: 'products', width: 50 } // Added products column
      ];

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
      // Define the table body
      const tableBody = [
        [
          { text: 'Order ID', style: 'tableHeader' },
          { text: 'A/c Holder Name', style: 'tableHeader' },
          { text: 'Order Date', style: 'tableHeader' },
          { text: 'Total Bill', style: 'tableHeader' },
          { text: 'Address', style: 'tableHeader' },
          { text: 'Products', style: 'tableHeader' }
        ],
        ...rows.map(row => [
          row.order_id,
          row.deliveryName,
          row.orderDate,
          `₹${row.finalPrice}`,
          row.address,
          row.products
        ])
      ];

      // Define the document definition
      const docDefinition = {
        content: [
          { text: 'Daily Sales Report', style: 'header', alignment: 'center' },
          { text: `Date: ${parsedDate.format('YYYY-MM-DD')}`, alignment: 'center' },
          { text: '\n\n' },
          {
            style: 'table',
            table: {
              headerRows: 1,
              widths: ['auto', '*', 'auto', 'auto', '*', '*'],
              body: tableBody
            }
          },
          { text: '\n\n' },
          { text: `Total Order Bill: ₹${totalOrderBill}`, alignment: 'right', style: 'total' }
        ],
        styles: {
          header: {
            fontSize: 16,
            bold: true
          },
          tableHeader: {
            bold: true,
            fontSize: 12,
            color: 'black'
          },
          total: {
            bold: true,
            fontSize: 14
          }
        }
      };

      // Generate the PDF
      const pdfDoc = printer.createPdfKitDocument(docDefinition);
      let buffers = [];
      pdfDoc.on('data', buffers.push.bind(buffers));
      pdfDoc.on('end', () => {
        let pdfData = Buffer.concat(buffers);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=DailySalesReport.pdf');
        res.send(pdfData);
      });

      pdfDoc.end();

    } else {
      res.status(400).json({ error: 'Invalid format. Please select either "excel" or "pdf".' });
    }

  } catch (error) {
    console.log('Error dailyDownload', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};


const monthlysales = async (req, res) => {
  try {
    console.log('===================in monthlysales')
    const monthinput = req.body?.month;
    console.log('monthinput: ', monthinput)
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
      orderStatus: {
        $nin: ["cancelled", "Return Approved"]
      }
    }).sort({ date: 'desc' })
      .skip(skip)
      .limit(perPage)
      .populate('orderItems');

    totalMonthlyBill = monthlyOrders.reduce(
      (total, order) => total + Number(order.finalPrice),
      0
    );

    const totalOrdersCount = await Order.countDocuments({
      orderDate: {
        $gte: startDate,
        $lte: endDate,
      },
      orderStatus: {
        $nin: ["cancelled", "Return Approved"]
      }
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
    console.log('===================in monthlyDownload');
    const monthinput = req.query.month;
    const format = req.query.format; // Extract the format from the query string
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
      orderStatus: { $in: ['Confirmed', 'Placed'] } // Filter by status
    }).populate('shippingAddress');

    // Calculate total monthly bill
    const totalMonthlyBill = monthlyOrders.reduce(
      (total, order) => total + Number(order.finalPrice),
      0
    );

    const rows = await Promise.all(monthlyOrders.map(async order => {
      try {
        const user = await UserAuth.findById(order.user_id).select('name');
        const address = await UserAddress.findById(order.shippingAddress).select('address_customer_name city pincode');
        const products = await fetchOrderItemsMonthly(order.orderItems);

        return {
          order_id: order.order_id || 'N/A',
          deliveryName: user ? user.name : 'Unknown User',
          orderDate: new Date(order.orderDate).toLocaleString(),
          paymentMethod: order.paymentMethod || 'N/A',
          finalPrice: order.finalPrice || 0,
          address: address ? `${address.address_customer_name}, ${address.city}, ${address.pincode}` : 'No Address',
          products: products || []
        };
      } catch (err) {
        console.error('Error fetching details for order:', err);
        return {
          order_id: 'N/A',
          deliveryName: 'Unknown User',
          orderDate: 'N/A',
          paymentMethod: 'N/A',
          finalPrice: 0,
          address: 'No Address',
          products: []
        };
      }
    }));

    if (format === 'pdf') {
      // Define the table body
      const tableBody = [
        [
          { text: 'Order ID', style: 'tableHeader' },
          { text: 'Order Date', style: 'tableHeader' },
          { text: 'Product Name', style: 'tableHeader' },
          { text: 'Product Weight', style: 'tableHeader' },
          { text: 'Address', style: 'tableHeader' },
          { text: 'Payment Method', style: 'tableHeader' },
          { text: 'Shipping Status', style: 'tableHeader' },
          { text: 'TOTAL BILL', style: 'tableHeader' }
        ],
        ...rows.map(row => [
          row.order_id,
          row.orderDate,
          row.products.length > 0 ? row.products.map(product => product.name).join(', ') : 'N/A',
          row.products.length > 0 ? row.products.map(product => product.weight).join(', ') : 'N/A',
          row.address,
          row.paymentMethod,
          row.orderStatus || 'N/A',
          `₹${row.finalPrice}`
        ])
      ];

      // Define the document definition
      const docDefinition = {
        content: [
          { text: 'Monthly Sales Report', style: 'header', alignment: 'center' },
          { text: `Period: ${startDate.toDateString()} - ${endDate.toDateString()}`, alignment: 'center' },
          { text: '\n\n' },
          {
            style: 'table',
            table: {
              headerRows: 1,
              widths: ['auto', 'auto','auto', 'auto', 'auto', 'auto', 'auto', '*'],
              body: tableBody
            }
          },
          { text: '\n\n' },
          { text: `Total Monthly Bill: ₹${totalMonthlyBill}`, alignment: 'right', style: 'total' }
        ],
        styles: {
          header: {
            fontSize: 16,
            bold: true
          },
          tableHeader: {
            bold: true,
            fontSize: 12,
            color: 'black'
          },
          total: {
            bold: true,
            fontSize: 14
          }
        }
      };

      // Generate the PDF
      const pdfDoc = printer.createPdfKitDocument(docDefinition);
      let buffers = [];
      pdfDoc.on('data', buffers.push.bind(buffers));
      pdfDoc.on('end', () => {
        let pdfData = Buffer.concat(buffers);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=MonthlySalesReport.pdf');
        res.send(pdfData);
      });

      pdfDoc.end();

    } else {
      res.status(400).json({ error: 'Invalid format. Please select "pdf".' });
    }

  } catch (error) {
    console.log('Error in monthlyDownload', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};



const fetchOrderItemsMonthly = async (orderItems) => {
  const items = await OrderItem.find({ _id: { $in: orderItems } }).populate('product_id', 'name');
  return items.map(item => {
    const productName = item.product_id ? item.product_id.name : 'Unknown Product';
    const orderedWeights = item.orderedWeight.map(ow => ({
      name: `${productName} (${ow.name})`,
      weight: ow.weight >= 1000 ? `${Math.floor(ow.weight / 1000)}kg ${ow.weight % 1000}g` : `${ow.weight}g`
    }));
    return orderedWeights;
  }).flat();
};



const yearlyreport = async (req, res) => {
  try {
    console.log('===========================yearlysales')
    const year = req.body.yearly;
    console.log('year: ', year);

    const yearlyorders = await Order.find({
      orderDate:
       { $gte: new Date(`${year}-01-01`),
        $lte: new Date(`${year}-12-31`) },
        orderStatus: {
          $nin: ["cancelled", "Return Approved"]
        }

    })
    .populate('user_id')
    .populate('shippingAddress')
    .populate('orderItems');
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