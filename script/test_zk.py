from zk import ZK

conn = ZK('192.168.18.91', port=4370, timeout=5, password=0, force_udp=True, ommit_ping=True)
zk = conn.connect()
print("Connected:", zk.get_firmware_version())
print("Users enrolled:", len(zk.get_users()))
zk.disconnect()