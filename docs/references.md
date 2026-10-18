# 课程参考与开源资料

本页记录课程设计所依据的公开书目方向、官方文档与可运行仓库。页面中的正文、图示、代码和习题均为本站原创解释；外部资料只用于延伸阅读与实训参考。

核验日期：2026-10-18。教材版次与购买信息请以出版社、图书馆目录或课程官方页面为准。

## 参考书目

| 课程 | 参考方向 | 使用方式 |
| --- | --- | --- |
| 自动控制理论 | 胡寿松《自动控制原理》（第八版），科学出版社 | 按“建模—时域—根轨迹—频域—状态空间—综合校正”的经典结构组织模块；本站不复制教材正文、例题或插图 |
| 自动控制理论 | 郑大钟《线性系统理论》，清华大学出版社 | 用于状态空间、能控能观与极点配置的概念顺序 |
| 运动控制 | Siciliano 等《机器人学：建模、规划与控制》 | 用于空间变换、雅可比、动力学与轨迹控制的概念框架 |
| 运动控制 | 清华大学机器人学与运动控制相关公开课程书目 | 用于关节驱动、接触、WBC 与 MPC 的工程组织；具体课程链接以校内公开页面为准 |
| 具身模型与算法 | Sutton & Barto, *Reinforcement Learning: An Introduction* | 用于 MDP、策略梯度、PPO 与价值估计的基本术语 |
| 具身模型与算法 | Thrun, Burgard & Fox, *Probabilistic Robotics* | 用于 Bayes 滤波、Kalman、粒子滤波、SLAM 与规划的概率视角 |
| 具身模型与算法 | 清华大学出版社人工智能与机器人相关公开书目 | 用于世界模型、模仿学习、VLA、估计与规划的专题组织 |

书目不附未经核验的购买链接。若出版社或课程页面更新版次，应同步修改课程页的 `book` 字段和本表说明。

## 官方文档与课程

- [ROS 2 Humble Documentation](https://docs.ros.org/en/humble/)：节点、话题、服务、`/cmd_vel`、`/joint_states` 与 ros2_control。
- [MuJoCo Documentation](https://mujoco.readthedocs.io/)：MJCF、接触动力学、传感器与仿真。
- [Isaac Lab Documentation](https://isaac-sim.github.io/IsaacLab/)：GPU 并行机器人学习、训练与部署。
- [Nav2 Documentation](https://docs.nav2.org/)：ROS 2 导航、行为树、规划器与控制器。
- [MoveIt 2 Documentation](https://moveit.picknik.ai/)：机械臂运动规划与 ROS 2 集成。
- [OMPL](https://ompl.kavrakilab.org/)：采样规划算法、基准与可视化。
- [FBSwiki](https://fbswiki.org/)：Åström 与 Murray 的 *Feedback Systems* 公开教材站点，覆盖反馈、稳定性与频域分析。

## 可运行开源仓库

### 控制、优化与规划

- [python-control](https://github.com/python-control/python-control)：传递函数、状态空间、根轨迹、Bode 与 Nyquist。
- [CasADi](https://github.com/casadi/casadi)：符号建模、非线性优化与最优控制。
- [OSQP](https://github.com/osqp/osqp)：稀疏二次规划。
- [qpOASES](https://github.com/coin-or/qpOASES)：嵌入式 QP。
- [PythonRobotics](https://github.com/AtsushiSakai/PythonRobotics)：定位、SLAM、A*、RRT 与控制算法示例。
- [GTSAM](https://github.com/borglab/gtsam)：因子图与位姿图优化。
- [Ceres Solver](https://github.com/ceres-solver/ceres-solver)：非线性最小二乘与鲁棒核。
- [OMPL](https://github.com/ompl/ompl)：采样运动规划库。

### 强化学习与机器人学习

- [Stable-Baselines3](https://github.com/DLR-RM/stable-baselines3)：PPO 等强化学习算法的可靠实现。
- [legged_gym](https://github.com/leggedrobotics/legged_gym)：四足机器人并行训练环境。
- [rsl_rl](https://github.com/leggedrobotics/rsl_rl)：面向腿足机器人的 PPO 与策略学习。
- [unitree_rl_gym](https://github.com/unitreerobotics/unitree_rl_gym)：Unitree 机器人强化学习环境。
- [MuJoCo](https://github.com/google-deepmind/mujoco)：接触动力学仿真与 MJCF。
- [Isaac Lab](https://github.com/isaac-sim/IsaacLab)：可扩展机器人学习框架。
- [LeRobot](https://github.com/huggingface/lerobot)：具身数据、模仿学习与策略工具链。
- [OpenVLA](https://github.com/openvla/openvla)：视觉语言动作模型。
- [OpenPI](https://github.com/Physical-Intelligence/openpi)：通用机器人策略与微调工具。
- [Habitat Lab](https://github.com/facebookresearch/habitat-lab)：具身导航与交互仿真。
- [ManiSkill](https://github.com/haosulab/ManiSkill)：操作技能学习与仿真基准。

### 平台与系统

- [DeepRoboticsLab](https://github.com/DeepRoboticsLab)：Lite3 的 ROS 2、模型、运动控制与强化学习仓库入口。
- [Lite3_ROS](https://github.com/DeepRoboticsLab/Lite3_ROS)：UDP 与 ROS 2 消息桥接。
- [Lite3_MotionSDK](https://github.com/DeepRoboticsLab/Lite3_MotionSDK)：运动控制与双主机通信示例。
- [deep_robotics_model](https://github.com/DeepRoboticsLab/deep_robotics_model)：URDF / MJCF / USD 模型。
- [FAST-LIVO2 Deep Robotics](https://github.com/DeepRoboticsLab/fast-livo2-deep-robotics)：LiDAR-惯性-视觉融合定位与建图。

## 内容维护规则

1. 新增外部链接前先访问并确认仓库、文档或课程页面有效。
2. 只引用官方仓库、官方文档、出版社页面或作者公开材料，不把二手镜像当作权威来源。
3. 不复制教材正文、习题、图片或第三方角色素材。
4. 算法实验的公式与实现需要保留输入、输出、约束与失败边界说明。
5. 修改教材版次时同步更新 `src/content/courses/*.mdx` 的 `book` 与 `references` 字段。
