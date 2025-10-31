USE [ship]
GO
--收缩数据库日志文件：
use master
ALTER DATABASE ship SET RECOVERY SIMPLE
DBCC SHRINKDATABASE(ship)
DBCC SHRINKFILE(2)
ALTER DATABASE ship SET RECOVERY FULL
--sp_change_users_login 'update_one','sqlrw','sqlrw'
--De0penl99O53!4N#~9.
--set datefirst 1  --将星期一设为第一天
EXEC sp_spaceused N'plc_data_history';
select 12*60*24*365*(4*2+10*15+11)/1024/1024

CREATE TABLE [dbo].[initial_value](
	[f1] [decimal](18, 2) NULL default(0),
	[f2] [decimal](18, 2) NULL default(0),
	[f3] [bit] NULL,
	[f4] [bit] NULL,
	[f5] [bit] NULL,
	[f6] [bit] NULL,
	[f7] [bit] NULL,
	[f8] [bit] NULL,
	[f9] [bit] NULL,
	[f10] [bit] NULL,
	[f11] [bit] NULL,
	[f12] [bit] NULL,
	[f13] [decimal](18, 2) NULL default(0),
	[f14] [bit] NULL,
	[f15] [decimal](18, 2) NULL default(0),
	[f16] [decimal](18, 2) NULL default(0),
	[f17] [decimal](18, 2) NULL default(0),
	[f18] [decimal](18, 2) NULL default(0),
	[f19] [decimal](18, 2) NULL default(0),
	[f20] [decimal](18, 2) NULL default(0),
	[s1] [decimal](18, 2) NULL default(0),
	[s2] [decimal](18, 2) NULL default(0),
	[s3] [decimal](18, 2) NULL default(0),
	[s4] [decimal](18, 2) NULL default(0),
	[s5] [decimal](18, 2) NULL default(0),
	[s6] [decimal](18, 2) NULL default(0)
) ON [PRIMARY]

CREATE TABLE [dbo].[daily](
	[regDate] smalldatetime null,
	[s1] [decimal](18, 2) NULL default(0),
	[s2] [decimal](18, 2) NULL default(0),
	[s3] [decimal](18, 2) NULL default(0),
	[s4] [decimal](18, 2) NULL default(0),
	[s5] [decimal](18, 2) NULL default(0),
	[s6] [decimal](18, 2) NULL default(0),
	[f13] [decimal](18, 2) NULL default(0),
	[f15] [decimal](18, 2) NULL default(0),
	[kind] int default(0)
) ON [PRIMARY]
GO

CREATE TABLE [dbo].[shipInfo](
	[sno] [varchar](50) NOT NULL,
	[shipName] [nvarchar](50) NULL,
	[regDate] [smalldatetime] NULL,
 CONSTRAINT [PK_shipInfo] PRIMARY KEY CLUSTERED 
(
	[sno] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]

--CREATE Date:2025-07-10
--根据给定日期时间，获取该时间点之后一小时内的数据
ALTER PROCEDURE [dbo].[getHistoryList]
	@startDate varchar(50), @mark varchar(50)
AS
BEGIN
	declare @endDate varchar(50)
	select @endDate = dateadd(hh,1,@startDate)
	if @mark='data'
		select *, FORMAT(regDate, 'HH:mm:ss') as [datetime] from [dbo].[plc_data_history] where regDate between @startDate and @endDate order by regDate desc
	if @mark='file'
		select FORMAT(regDate, 'HH:mm:ss') as [时间], * from [dbo].[plc_data_history] where regDate between @startDate and @endDate order by regDate desc
END
GO

--CREATE Date:2025-07-10
--根据给定日期时间，获取某天之前30天的日志
ALTER PROCEDURE [dbo].[getDailyList]
	@startDate varchar(50), @mark varchar(50)
AS
BEGIN
	if @mark='data'
		select top 30 *, FORMAT(regDate, 'yyyy-MM-dd') as [datetime] from [dbo].[daily] where regDate <= @startDate and kind=1 order by regDate desc
	if @mark='file'
		select top 30 FORMAT(regDate, 'yyyy-MM-dd') as [日期], s1 as [左主机运行小时], s2 as [右主机运行小时], s3 as [1#发电机运行小时], s4 as [2#发电机运行小时], s5 as [3#发电机运行小时], s6 as [岸电接通小时], f13 as [岸电用量], f15 as [驳油量] from [dbo].[daily] where regDate <= @startDate and kind=1 order by regDate desc
END
GO

--CREATE Date:2025-07-10
--获取最新的发送记录，大于指定编号的数据
ALTER PROCEDURE [dbo].[getSendData]
	@lastID int
AS
BEGIN
	select top 1 ID, qty, FORMAT(sendDate, 'yyyy-MM-dd HH:mm:ss.fff') as sendDate, status, isnull(memo,'') as memo from [dbo].[sendInfo] where ID>@lastID order by ID desc
END
GO

--CREATE Date:2025-07-10
--获取最新的采集数据
ALTER PROCEDURE [dbo].[getCaptureData]
	@lastID int
AS
BEGIN
	select top 1 *, FORMAT(regDate, 'yyyy-MM-dd HH:mm:ss.fff') as [datetime] from [dbo].[plc_data] order by ID desc
END
GO

--CREATE Date:2025-07-10
--获取要发送的数据，不超过100条
ALTER PROCEDURE [dbo].[pickSendData]
	@sendID int
AS
BEGIN
	-- 先标记
	update [dbo].[plc_data] set sendID=@sendID where ID in(select top 100 ID from [dbo].[plc_data] where sendID=0 order by ID)
	-- 后查询
	select *, ID as [orgId], FORMAT(regDate, 'yyyy-MM-dd HH:mm:ss.fff') as [datetime] from [dbo].[plc_data] where sendID=@sendID order by ID
END
GO

--CREATE Date:2025-07-10
--更新或添加数据发送信息
ALTER PROCEDURE [dbo].[updateSendInfo]
	@ID int, @qty int, @status int, @msg nvarchar(500)
AS
BEGIN
	if @ID=0
	begin
		insert into sendInfo(qty,status,memo) values(@qty,@status,@msg)
		select @ID=max(ID) from sendInfo
	end
	else
	begin
		update sendInfo set qty=@qty, status=@status, memo=@msg where ID=@ID
		-- 发送成功，移除这些数据到历史记录。否则去除标记，恢复未发送状态
		if @status=1
		begin
			insert into [dbo].[plc_data_history] select * from [dbo].[plc_data] where sendID=@ID
			delete from [dbo].[plc_data] where sendID=@ID
		end
		else
		begin
			if @status=4
				delete from sendInfo where ID=@ID	--没有数据的空操作，删除发送记录
			else
				update [dbo].[plc_data] set sendID=0 where sendID=@ID
		end
	end

	select @ID as re
END
GO

--CREATE Date:2025-07-10
--获取某个编号的船舶信息
CREATE PROCEDURE [dbo].[getShipInfo]
	@sno varchar(50)
AS
BEGIN
	select * from [dbo].[shipInfo] where sno=@sno
END
GO

--CREATE Date:2025-07-10
--添加采集到的PLC数据
ALTER PROCEDURE [dbo].[add_plc_data]
	@f1 varchar(50),@f2 varchar(50),@f3 varchar(50),@f4 varchar(50),@f5 varchar(50),@f6 varchar(50),@f7 varchar(50),@f8 varchar(50),@f9 varchar(50),@f10 varchar(50),@f11 varchar(50),@f12 varchar(50),@f13 varchar(50),@f14 varchar(50),@f15 varchar(50),@f16 varchar(50),@f17 varchar(50),@f18 varchar(50),@f19 varchar(50),@f20 decimal(18,2),
	@s1 varchar(50),@s2 varchar(50),@s3 varchar(50),@s4 varchar(50),@s5 varchar(50),@s6 varchar(50)
AS
BEGIN
	--需要添加初始值
	declare @f13a decimal(18,2), @f15a int, @s1a int, @s2a int, @s3a int, @s4a int, @s5a int, @s6a int
	select @f13a=f13, @f15a=f15, @s1a=s1, @s2a=s2, @s3a=s3, @s4a=s4, @s5a=s5, @s6a=s6 from [dbo].[initial_value]
	select @f13 = cast(@f13 as int)*0.3
	insert into [dbo].[plc_data](f1,f2,f3,f4,f5,f6,f7,f8,f9,f10,f11,f12,f13,f14,f15,f16,f17,f18,f19,f20,s1,s2,s3,s4,s5,s6) select @f1,@f2,@f3,@f4,@f5,@f6,@f7,@f8,@f9,@f10,@f11,@f12,@f13+isnull(@f13a,0),@f14,@f15+isnull(@f15a,0),iif(cast(@f16 as decimal(18,2))<0.0,0,@f16),iif(cast(@f17 as decimal(18,2))<0.0,0,@f17),@f18,@f19,@f20/10.0,@s1+isnull(@s1a,0),@s2+isnull(@s2a,0),@s3+isnull(@s3a,0),@s4+isnull(@s4a,0),@s5+isnull(@s5a,0),@s6+isnull(@s6a,0)
	--检查是否有当天日志数据
	if format(getDate(),'HH')=18 and not exists(select 1 from daily where regDate=format(getDate(),'yyyy-MM-dd'))
	begin
		--添加当天数据
		insert into daily select getDate(),@s1,@s2,@s3,@s4,@s5,@s6,@f13,@f15,0
		declare @lastday varchar(50)
		select @lastday = dateadd(d,-1,getDate())
		--计算当天日志
		select @f13a=f13, @f15a=f15, @s1a=s1, @s2a=s2, @s3a=s3, @s4a=s4, @s5a=s5, @s6a=s6 from daily where regDate=@lastday and kind=0
		insert into daily select getDate(),@s1-isnull(@s1a,0),@s2-isnull(@s2a,0),@s3-isnull(@s3a,0),@s4-isnull(@s4a,0),@s5-isnull(@s5a,0),@s6-isnull(@s6a,0),@f13-isnull(@f13a,0),@f15-isnull(@f15a,0),1
	end
END
GO

--CREATE Date:2025-07-10
--检查数据，将超过一年的清理掉
ALTER PROCEDURE [dbo].[daily_work]
AS
BEGIN
	-- 一年前的历史数据
	delete from [dbo].[plc_data_history] where regDate<dateadd(d,-365,getDate())
	-- 一年前的发送记录
	delete from [dbo].[sendInfo] where sendDate<dateadd(d,-365,getDate())
END
GO

--CREATE Date:2025-09-08
--获取初始值
CREATE PROCEDURE [dbo].[getInitialValue]
AS
BEGIN
	select top 1 * from [dbo].[initial_value]
END
GO

--CREATE Date:2025-09-08
--更新初始值
CREATE PROCEDURE [dbo].[updateInitialValue]
	@f13 decimal(18,2), @f15 int, @s1 int, @s2 int, @s3 int, @s4 int, @s5 int, @s6 int
AS
BEGIN
	update [initial_value] set f13=isnull(@f13,0), f15=isnull(@f15,0), s1=isnull(@s1,0), s2=isnull(@s2,0), s3=isnull(@s3,0), s4=isnull(@s4,0), s5=isnull(@s5,0), s6=isnull(@s6,0)
END
GO

--CREATE Date:2025-09-10
--更新船舶信息
CREATE PROCEDURE [dbo].[setShipList]
	@sno varchar(50), @shipName nvarchar(50)
AS
BEGIN
	if exists(select 1 from shipInfo where sno=@sno)
		update shipInfo set shipName=@shipName, regDate=getDate() where sno=@sno
	else
		insert into shipInfo(sno,shipName) values(@sno,@shipName)
END
GO

