const User = require('../models/User');
const Order = require('../models/Order');
const Crop = require('../models/Crop');
const Bargain = require('../models/Bargain');

const getDashboardStats = async (req, res) => {
  try {
    const totalFarmers = await User.countDocuments({ role: 'farmer' });
    const totalBuyers = await User.countDocuments({ role: 'buyer' });
    const totalOrders = await Order.countDocuments();
    
    const revenueAgg = await Order.aggregate([
      { $group: { _id: null, totalRevenue: { $sum: "$totalPrice" } } }
    ]);
    const totalRevenue = revenueAgg[0] ? revenueAgg[0].totalRevenue : 0;
    
    const activeBargains = await Bargain.countDocuments({ status: 'active' });

    res.json({
      totalFarmers,
      totalBuyers,
      totalOrders,
      totalRevenue,
      activeBargains
    });
  } catch (error) {
    console.error('getDashboardStats error:', error);
    res.status(500).json({ message: 'Server error fetching stats' });
  }
};

const getUsers = async (req, res) => {
  try {
    const role = req.query.role; // 'farmer' or 'buyer'
    const query = role ? { role } : { role: { $in: ['farmer', 'buyer'] } };
    
    // Base aggregation for users
    const pipeline = [
      { $match: query },
      {
        $lookup: {
          from: 'orders',
          localField: '_id',
          foreignField: role === 'farmer' ? 'farmerId' : (role === 'buyer' ? 'buyerId' : 'farmerId'), // default fallback
          as: 'orders'
        }
      },
      {
        $lookup: {
          from: 'crops',
          localField: '_id',
          foreignField: 'farmerId',
          as: 'crops'
        }
      },
      {
        $project: {
          _id: 1,
          name: 1,
          email: 1,
          role: 1,
          address: 1,
          phone: 1,
          joinedAt: 1,
          orderCount: { $size: "$orders" },
          cropCount: { $size: "$crops" },
          revenue: { $sum: "$orders.totalPrice" }
        }
      },
      { $sort: { joinedAt: -1 } }
    ];

    // If fetching all users without specific role param, we need to handle revenue projection correctly,
    // but a simple approach is just letting MongoDB sum up any orders where they are either buyer or farmer.
    // To be precise, if role is undefined, we might just lookup where user is buyer or farmer.
    // For simplicity, we can modify the lookup if role is missing:
    if (!role) {
      pipeline[1] = {
        $lookup: {
          from: 'orders',
          let: { userId: '$_id' },
          pipeline: [
            { $match: { $expr: { $or: [ { $eq: ['$farmerId', '$$userId'] }, { $eq: ['$buyerId', '$$userId'] } ] } } }
          ],
          as: 'orders'
        }
      };
    }

    const users = await User.aggregate(pipeline);
    
    // Standardize _id to id for frontend compatibility
    const mappedUsers = users.map(u => ({ ...u, id: u._id.toString() }));

    res.json(mappedUsers);
  } catch (error) {
    console.error('getUsers error:', error);
    res.status(500).json({ message: 'Server error fetching users' });
  }
};

const getOrders = async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    const mapped = orders.map(o => {
      const obj = o.toObject();
      obj.id = obj._id.toString();
      return obj;
    });
    res.json(mapped);
  } catch (error) {
    console.error('getOrders error:', error);
    res.status(500).json({ message: 'Server error fetching orders' });
  }
};

const getRevenueData = async (req, res) => {
  try {
    const revenueByMonth = await Order.aggregate([
      {
        $group: {
          _id: { 
            month: { $month: "$createdAt" }, 
            year: { $year: "$createdAt" } 
          },
          totalRevenue: { $sum: "$totalPrice" },
          orderCount: { $sum: 1 }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } }
    ]);

    const totalRevenueAgg = await Order.aggregate([
      { $group: { _id: null, totalRevenue: { $sum: "$totalPrice" }, orderCount: { $sum: 1 } } }
    ]);
    
    const totalRevenue = totalRevenueAgg[0] ? totalRevenueAgg[0].totalRevenue : 0;
    const totalOrders = totalRevenueAgg[0] ? totalRevenueAgg[0].orderCount : 0;
    const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

    res.json({
      revenueByMonth,
      totalRevenue,
      avgOrderValue
    });
  } catch (error) {
    console.error('getRevenueData error:', error);
    res.status(500).json({ message: 'Server error fetching revenue data' });
  }
};

const getBargains = async (req, res) => {
  try {
    const bargains = await Bargain.find().sort({ updatedAt: -1 });
    const mapped = bargains.map(b => {
      const obj = b.toObject();
      obj.id = obj._id.toString();
      return obj;
    });
    res.json(mapped);
  } catch (error) {
    console.error('getBargains error:', error);
    res.status(500).json({ message: 'Server error fetching bargains' });
  }
};

module.exports = {
  getDashboardStats,
  getUsers,
  getOrders,
  getRevenueData,
  getBargains
};
